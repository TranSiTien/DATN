from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from models.data_models import ChatContext, AgentResponse
from models.memory_store import AgentMemoryManager
import json

class GeneralInquiryAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="general_inquiry")
        
        self.system_prompt = """
        You are the General Inquiry Agent for HTXapt.com apartment rental platform.
        
        Your role is to handle questions that don't specifically relate to:
        - User profile building/preferences
        - Neighborhood information
        - Apartment searching
        
        You should answer questions about:
        - The rental platform itself and how it works
        - General rental processes and terminology
        - Leasing and application procedures
        - Payment methods and deposits
        - Moving logistics
        - Account management
        - Any other general inquiries
        
        Always be helpful, concise, and informative. If a question should be handled by one of the
        specialized agents, acknowledge this and explain which agent would be better suited to help.
        
        Remember:
        - Don't make up information about specific apartments or neighborhoods
        - If you don't know something, say so rather than inventing details
        - Keep responses friendly but professional
        """
    
    def process_message(self, context: ChatContext) -> AgentResponse:
        """Process user message and generate a helpful response for general inquiries"""
        
        # Get session ID
        session_id = context.sessionId
        
        # Get chat history for this session
        chat_history = self.memory_manager.get_chat_history(session_id, k=8)  # Last 8 exchanges
        
        # Save the user message to memory
        self.memory_manager.add_user_message(
            session_id=session_id,
            message=context.chatInput,
            metadata={"email": context.email}
        )
        
        prompt = f"""
        User Message: {context.chatInput}
        User Email: {context.email}
        
        Chat History:
        {chat_history}
        
        Please provide a helpful response to this general inquiry.
        """
        
        response = self.llm.invoke([
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=prompt)
        ])
        
        # Analyze confidence in handling this query
        confidence_analysis = self._analyze_confidence(context.chatInput)
        
        agent_response = AgentResponse(
            response=response.content,
            agent_name="general_inquiry",
            isHandOff=confidence_analysis["is_handoff"],
            confidence_score=confidence_analysis["confidence"],
            next_actions=confidence_analysis["next_actions"],
            metadata={"query_type": confidence_analysis["query_type"]}
        )
        
        # Save the AI response to memory
        self.memory_manager.add_ai_message(
            session_id=session_id,
            message=agent_response.response,
            metadata={"query_type": confidence_analysis["query_type"]}
        )
        
        return agent_response
    
    def _analyze_confidence(self, query: str) -> dict:
        """Analyze how confident this agent should be in handling the query"""
        
        confidence_prompt = f"""
        Query: {query}
        
        Analyze if this query is a general inquiry or should be handled by a specialized agent.
        
        Response format:
        {{
            "query_type": "general|platform|account|payment|moving|other",
            "confidence": <float between 0 and 1>,
            "is_handoff": <boolean>,
            "next_actions": [<list of suggested next actions>]
        }}
        """
        
        response = self.llm.invoke([
            SystemMessage(content="You analyze queries to determine if they're general inquiries."),
            HumanMessage(content=confidence_prompt)
        ])
        
        try:
            return json.loads(response.content)
        except:
            # Default values if parsing fails
            return {
                "query_type": "general",
                "confidence": 0.7,
                "is_handoff": False,
                "next_actions": []
            } 