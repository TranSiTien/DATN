import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json

# Load environment variables
load_dotenv()

# Import agents
from agents.orchestrator import OrchestratorAgent
from agents.profile_builder import ProfileBuilderAgent
from agents.neighborhood_expert import NeighborhoodExpertAgent
from agents.apartment_search import ApartmentSearchAgent
from agents.general_inquiry import GeneralInquiryAgent
from agents.amenity_builder import AmenityBuilderAgent
from models.data_models import ChatContext, UserProfile, AgentResponse
from tools.api_tools import GetUserProfileTool

class ChatRequest(BaseModel):
    sessionId: str
    email: str
    chatInput: str

class ApartmentAISystem:
    def __init__(self, openai_api_key: str):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_api_key,
            temperature=0.7
        )
        
        # Initialize agents
        self.orchestrator = OrchestratorAgent(self.llm)
        self.profile_builder = ProfileBuilderAgent(self.llm)
        self.neighborhood_expert = NeighborhoodExpertAgent(self.llm)
        self.apartment_search = ApartmentSearchAgent(self.llm)
        self.general_inquiry = GeneralInquiryAgent(self.llm)
        self.amenity_builder = AmenityBuilderAgent(self.llm)
        
        # Connect orchestrator with specialized agents for checking completion status
        self.orchestrator.set_agent_references(self.neighborhood_expert, self.amenity_builder)
        
        # Session management
        self.sessions = {}
    
    def process_chat(self, session_id: str, email: str, chat_input: str) -> dict:
        """Main chat processing entry point"""
        
        # Get context
        context = self._get_context(session_id, email, chat_input)
        
        # Route conversation
        routing = self.orchestrator.route_conversation(context)
        
        # Process through agents
        results = []
        for agent_name in routing["agents_to_call"]:
            if agent_name == "PROFILE_BUILDER" or agent_name == "profile_builder":
                result = self.profile_builder.process_message(context)
                agent_name = "profile_builder"
            elif agent_name == "NEIGHBORHOOD_EXPERT" or agent_name == "neighborhood_expert":
                result = self.neighborhood_expert.process_message(context)
                agent_name = "neighborhood_expert"
            elif agent_name == "APARTMENT_SEARCH" or agent_name == "apartment_search":
                result = self.apartment_search.process_message(context)
                agent_name = "apartment_search"
            elif agent_name == "GENERAL_INQUIRY" or agent_name == "general_inquiry":
                result = self.general_inquiry.process_message(context)
                agent_name = "general_inquiry"
            elif agent_name == "AMENITY_BUILDER" or agent_name == "amenity_builder":
                result = self.amenity_builder.process_message(context)
                agent_name = "amenity_builder"
            else:
                continue
                
            # Check if we need to delegate to another agent
            if result.isHandOff and result.next_actions:
                next_agent = result.next_actions[0]
                if next_agent == "profile_builder":
                    next_result = self.profile_builder.process_message(context)
                    results.append(("profile_builder", next_result))
                elif next_agent == "neighborhood_expert":
                    next_result = self.neighborhood_expert.process_message(context)
                    results.append(("neighborhood_expert", next_result))
                elif next_agent == "amenity_builder":
                    next_result = self.amenity_builder.process_message(context)
                    results.append(("amenity_builder", next_result))
                
            results.append((agent_name, result))
        
        # Synthesize response
        final_response = self._synthesize_responses(results, routing)
        
        # Update session
        self._update_session(session_id, context, final_response)
        
        return final_response
    
    def _get_context(self, session_id: str, email: str, chat_input: str) -> ChatContext:
        """Build current context"""
        try:
            profile_tool = GetUserProfileTool()
            profile_data = profile_tool._run(email)
            current_profile = UserProfile(**json.loads(profile_data))
        except:
            current_profile = UserProfile(email=email)
        
        return ChatContext(
            sessionId=session_id,
            email=email,
            chatInput=chat_input,
            currentProfile=current_profile
        )
    
    def _synthesize_responses(self, results: list, routing: dict) -> dict:
        """Combine multiple agent responses"""
        if len(results) == 1:
            agent_name, result = results[0]
            return {
                "response": result.response,
                "isHandOff": result.isHandOff,
                "agentUsed": agent_name,
                "confidence": result.confidence_score,
                "metadata": result.metadata,
                "conversationContext": routing.get("conversation_context", {})
            }
        
        # Multiple agents - combine intelligently
        combined = {
            "response": "",
            "isHandOff": False,
            "agentsUsed": [r[0] for r in results],
            "routing": routing.get("reasoning", ""),
            "conversationContext": routing.get("conversation_context", {})
        }
        
        for agent_name, result in results:
            combined["response"] += f"{result.response}\n\n"
            if result.isHandOff:
                combined["isHandOff"] = True
        
        combined["response"] = combined["response"].strip()
        return combined
    
    def _update_session(self, session_id: str, context: ChatContext, response: dict):
        """Update session memory"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        # Get the current conversation context from the orchestrator
        conversation_context = self.orchestrator.get_current_context(session_id)
        
        self.sessions[session_id].append({
            "user_message": context.chatInput,
            "response": response,
            "timestamp": context.timestamp.isoformat(),
            "conversation_context": conversation_context
        })

# Initialize the AI system
ai_system = ApartmentAISystem(os.getenv("OPENAI_API_KEY"))

# FastAPI app for serving the system
app = FastAPI(title="Apartment AI System")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint"""
    try:
        response = ai_system.process_chat(
            request.sessionId,
            request.email,
            request.chatInput
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)