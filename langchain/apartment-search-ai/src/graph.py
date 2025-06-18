import os
from typing import Dict, List, TypedDict, Annotated, Literal, Any
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

# Import agents from the agents module
from agents.orchestrator import OrchestratorAgent
from agents.profile_builder import ProfileBuilderAgent
from agents.neighborhood_expert import NeighborhoodExpertAgent
from agents.apartment_search import ApartmentSearchAgent
from agents.general_inquiry import GeneralInquiryAgent
from agents.amenity_builder import AmenityBuilderAgent
from models.data_models import ChatContext, UserProfile, AgentResponse

# Load environment variables
load_dotenv()

# Define graph state
class GraphState(TypedDict):
    chat_context: ChatContext
    agent_responses: Dict[str, AgentResponse]
    next_agent: Literal["orchestrator", "profile_builder", "neighborhood_expert", "apartment_search", "general_inquiry", "amenity_builder", None]
    final_response: str
    conversation_context: Dict[str, Any]

# Initialize agents
llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.7
)

orchestrator_agent = OrchestratorAgent(llm)
profile_builder_agent = ProfileBuilderAgent(llm)
neighborhood_expert_agent = NeighborhoodExpertAgent(llm)
apartment_search_agent = ApartmentSearchAgent(llm)
general_inquiry_agent = GeneralInquiryAgent(llm)
amenity_builder_agent = AmenityBuilderAgent(llm)

# Connect orchestrator with specialized agents for checking completion status
orchestrator_agent.set_agent_references(neighborhood_expert_agent, amenity_builder_agent)

# Define agent nodes
def orchestrator_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    routing = orchestrator_agent.route_conversation(context)
    
    # Extract conversation context
    conversation_context = routing.get("conversation_context", {})
    
    # Determine the next agent to call
    next_agents = routing.get("agents_to_call", [])
    next_agent = next_agents[0] if next_agents else None
    
    return {
        **state,
        "next_agent": next_agent,
        "conversation_context": conversation_context
    }

def profile_builder_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    response = profile_builder_agent.process_message(context)
    
    # Store response
    agent_responses = state.get("agent_responses", {})
    agent_responses["profile_builder"] = response
    
    return {
        **state,
        "agent_responses": agent_responses,
        "next_agent": None  # Let the router decide what's next
    }

def neighborhood_expert_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    response = neighborhood_expert_agent.process_message(context)
    
    # Store response
    agent_responses = state.get("agent_responses", {})
    agent_responses["neighborhood_expert"] = response
    
    return {
        **state,
        "agent_responses": agent_responses,
        "next_agent": None  # Let the router decide what's next
    }

def apartment_search_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    response = apartment_search_agent.process_message(context)
    
    # Store response
    agent_responses = state.get("agent_responses", {})
    agent_responses["apartment_search"] = response
    
    return {
        **state,
        "agent_responses": agent_responses,
        "next_agent": None  # Let the router decide what's next
    }

def general_inquiry_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    response = general_inquiry_agent.process_message(context)
    
    # Store response
    agent_responses = state.get("agent_responses", {})
    agent_responses["general_inquiry"] = response
    
    return {
        **state,
        "agent_responses": agent_responses,
        "next_agent": None  # Let the router decide what's next
    }

def amenity_builder_node(state: GraphState) -> GraphState:
    context = state["chat_context"]
    response = amenity_builder_agent.process_message(context)
    
    # Store response
    agent_responses = state.get("agent_responses", {})
    agent_responses["amenity_builder"] = response
    
    # Check if we should hand off to another agent
    next_agent = None
    if response.isHandOff and response.next_actions:
        next_agent = response.next_actions[0]
    
    return {
        **state,
        "agent_responses": agent_responses,
        "next_agent": next_agent
    }

def response_synthesizer(state: GraphState) -> GraphState:
    """Combine agent responses into a final response"""
    agent_responses = state.get("agent_responses", {})
    conversation_context = state.get("conversation_context", {})
    
    if len(agent_responses) == 1:
        # Only one agent responded
        agent_name = list(agent_responses.keys())[0]
        result = agent_responses[agent_name]
        final_response = result.response
    else:
        # Multiple agents - combine responses
        final_response = ""
        for agent_name, result in agent_responses.items():
            final_response += f"{result.response}\n\n"
        final_response = final_response.strip()
    
    return {
        **state,
        "final_response": final_response,
        "conversation_context": conversation_context
    }

# Define conditional routing
def should_route_to_agent(state: GraphState) -> str:
    next_agent = state.get("next_agent")
    if next_agent == "profile_builder":
        return "profile_builder"
    elif next_agent == "neighborhood_expert":
        return "neighborhood_expert"
    elif next_agent == "apartment_search":
        return "apartment_search"
    elif next_agent == "general_inquiry":
        return "general_inquiry"
    elif next_agent == "amenity_builder":
        return "amenity_builder"
    else:
        return "synthesizer"

# Create the graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("profile_builder", profile_builder_node)
workflow.add_node("neighborhood_expert", neighborhood_expert_node)
workflow.add_node("apartment_search", apartment_search_node)
workflow.add_node("general_inquiry", general_inquiry_node)
workflow.add_node("amenity_builder", amenity_builder_node)
workflow.add_node("synthesizer", response_synthesizer)

# Define edges with proper conditional routing
workflow.set_entry_point("orchestrator")

# Add conditional edges from orchestrator to the appropriate agent
workflow.add_conditional_edges(
    "orchestrator",
    should_route_to_agent,
    {
        "profile_builder": "profile_builder",
        "neighborhood_expert": "neighborhood_expert",
        "apartment_search": "apartment_search",
        "general_inquiry": "general_inquiry",
        "amenity_builder": "amenity_builder",
        "synthesizer": "synthesizer"
    }
)

# Add edges back to the orchestrator
workflow.add_edge("profile_builder", "orchestrator")
workflow.add_edge("neighborhood_expert", "orchestrator")
workflow.add_edge("apartment_search", "orchestrator")
workflow.add_edge("general_inquiry", "orchestrator")
workflow.add_edge("amenity_builder", "orchestrator")
workflow.add_edge("synthesizer", END)

# Compile the graph
graph_instance = workflow.compile()

def get_initial_state(chat_request: dict) -> GraphState:
    """Initialize state from chat request"""
    from tools.api_tools import GetUserProfileTool
    import json
    
    print(f"Type of chat_request: {type(chat_request)}")
    print(f"Content of chat_request: {chat_request}")
    
    # Extract data safely
    session_id = ""
    email = ""
    chat_input = ""
    
    try:
        if isinstance(chat_request, dict):
            session_id = chat_request.get("sessionId", "")
            email = chat_request.get("email", "")
            chat_input = chat_request.get("chatInput", "")
        elif hasattr(chat_request, "sessionId"):
            session_id = chat_request.sessionId
            email = chat_request.email
            chat_input = chat_request.chatInput
        else:
            # Try to convert to dict if it's a string
            if isinstance(chat_request, str):
                try:
                    data = json.loads(chat_request)
                    session_id = data.get("sessionId", "")
                    email = data.get("email", "")
                    chat_input = data.get("chatInput", "")
                except:
                    pass
    except Exception as e:
        print(f"Error extracting data from chat_request: {e}")
    
    # Default email for testing if none provided
    if not email:
        email = "test@example.com"
    
    try:
        profile_tool = GetUserProfileTool()
        profile_data = profile_tool._run(email)
        current_profile = UserProfile(**json.loads(profile_data))
    except Exception as e:
        print(f"Error getting user profile: {e}")
        current_profile = UserProfile(email=email)
    
    context = ChatContext(
        sessionId=session_id,
        email=email,
        chatInput=chat_input,
        currentProfile=current_profile
    )
    
    return {
        "chat_context": context,
        "agent_responses": {},
        "next_agent": "orchestrator",
        "final_response": "",
        "conversation_context": {}
    } 