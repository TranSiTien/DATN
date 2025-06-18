from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from models.data_models import ChatContext
from models.memory_store import AgentMemoryManager
import json
from typing import Dict, List, Optional

class OrchestratorAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        # Track conversation context for each session
        self.session_contexts: Dict[str, Dict] = {}
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="orchestrator")
        
        # References to other agents for stage checking
        self.neighborhood_expert = None
        self.amenity_builder = None
        
        self.system_prompt = """
        You are the Orchestrator Agent for HTXapt.com apartment rental platform.
        
        Analyze user messages and route to appropriate specialists:
        1. PROFILE_BUILDER - For building/updating user preferences
        2. NEIGHBORHOOD_EXPERT - For neighborhood information and recommendations  
        3. APARTMENT_SEARCH - For finding and recommending apartments
        4. GENERAL_INQUIRY - For general questions about renting, the platform, or anything not covered by other agents
        5. AMENITY_BUILDER - Specialized agent for helping users select amenities
        
        PRIORITY ROUTING RULES:
        - If the user is in the middle of building their profile, prioritize completing that
        - If they have started but not completed amenity selection, route to AMENITY_BUILDER
        - If they have started but not completed neighborhood selection, route to NEIGHBORHOOD_EXPERT
        - If they're discussing amenities specifically, route to AMENITY_BUILDER
        - If they're discussing neighborhoods specifically, route to NEIGHBORHOOD_EXPERT
        - Only route to APARTMENT_SEARCH when their profile is reasonably complete
        
        Consider:
        - User's current profile completeness
        - Type of question being asked
        - Whether they're ready to search or still exploring
        - Whether the question is related to apartments or is a general inquiry
        - The current conversation context and what the user is focused on right now
        - If the user is specifically discussing amenities, route to the AMENITY_BUILDER
        - Just put only necessary agents to call
        
        Response format:
        {
            "agents_to_call": ["agent_name1", "agent_name2"],
            "reasoning": "Why this routing decision",
            "conversation_context": {
                "current_focus": "profile_building|neighborhood_exploration|amenity_selection|apartment_search|general_inquiry|onboarding",
                "user_intent": "Brief description of what the user is trying to do",
                "next_logical_step": "What should happen next in the conversation flow"
            }
        }
        """
    
    def set_agent_references(self, neighborhood_expert, amenity_builder):
        """Set references to other agents for checking completion status"""
        self.neighborhood_expert = neighborhood_expert
        self.amenity_builder = amenity_builder
    
    def route_conversation(self, context: ChatContext) -> dict:
        # Get previous context for this session if it exists
        session_id = context.sessionId
        previous_context = self.session_contexts.get(session_id, {})
        
        # Get chat history for this session
        chat_history = self.memory_manager.get_chat_history(session_id, k=8)  # Last 8 exchanges
        
        # Check if user has incomplete amenity or neighborhood selection
        amenity_selection_incomplete = False
        neighborhood_selection_incomplete = False
        
        if self.amenity_builder:
            amenity_selection_incomplete = not self.amenity_builder.is_amenity_selection_complete(session_id)
            
        if self.neighborhood_expert:
            neighborhood_selection_incomplete = not self.neighborhood_expert.is_neighborhood_selection_complete(session_id)
        
        # Save the user message to memory
        self.memory_manager.add_user_message(
            session_id=session_id,
            message=context.chatInput,
            metadata={"email": context.email}
        )
        
        # Override routing if specialized tasks are incomplete
        if amenity_selection_incomplete and self._is_amenity_related(context.chatInput):
            routing_result = self._create_routing_result(["amenity_builder"], "Continuing incomplete amenity selection", session_id)
            
            # Save the routing decision to memory
            self._save_routing_to_memory(session_id, routing_result)
            
            return routing_result
            
        if neighborhood_selection_incomplete and self._is_neighborhood_related(context.chatInput):
            routing_result = self._create_routing_result(["neighborhood_expert"], "Continuing incomplete neighborhood selection", session_id)
            
            # Save the routing decision to memory
            self._save_routing_to_memory(session_id, routing_result)
            
            return routing_result
        
        # Regular routing logic for other cases
        prompt = f"""
        User Message: {context.chatInput}
        
        Previous Conversation Context: {json.dumps(previous_context) if previous_context else "New conversation"}
        
        Chat History:
        {chat_history}
        
        Analyze and route this conversation. Determine what the user is currently focused on and their intent.
        """
        
        response = self.llm.invoke([
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=prompt)
        ])
        
        try:
            routing_result = json.loads(response.content)
            
            # If the user message is amenity-related and we have an incomplete amenity selection,
            # override the routing to go to amenity builder
            if amenity_selection_incomplete and any(agent in ["apartment_search", "profile_builder"] for agent in routing_result.get("agents_to_call", [])):
                if self._is_amenity_related(context.chatInput):
                    routing_result = self._create_routing_result(["amenity_builder"], "Redirecting to complete amenity selection first", session_id)
            
            # If the user message is neighborhood-related and we have an incomplete neighborhood selection,
            # override the routing to go to neighborhood expert
            if neighborhood_selection_incomplete and any(agent in ["apartment_search", "profile_builder"] for agent in routing_result.get("agents_to_call", [])):
                if self._is_neighborhood_related(context.chatInput):
                    routing_result = self._create_routing_result(["neighborhood_expert"], "Redirecting to complete neighborhood selection first", session_id)
            
            # Store updated conversation context for this session
            if "conversation_context" in routing_result:
                self.session_contexts[session_id] = routing_result["conversation_context"]
            
            # Save the routing decision to memory
            self._save_routing_to_memory(session_id, routing_result)
            
            return routing_result
        except Exception as e:
            print(f"Error parsing orchestrator response: {e}")
            # Default fallback
            routing_result = {
                "agents_to_call": ["general_inquiry"],
                "reasoning": "Default to general inquiry for unclear requests to introduce system capabilities",
                "conversation_context": {
                    "current_focus": "onboarding",
                    "user_intent": "Starting conversation with the system",
                    "next_logical_step": "Introduce capabilities and gather profile information"
                }
            }
            
            self.session_contexts[session_id] = routing_result["conversation_context"]
            
            # Save the routing decision to memory
            self._save_routing_to_memory(session_id, routing_result)
            
            return routing_result
    
    def _save_routing_to_memory(self, session_id: str, routing_result: Dict) -> None:
        """Save the routing decision to memory"""
        self.memory_manager.add_ai_message(
            session_id=session_id,
            message=f"[Routing to: {', '.join(routing_result.get('agents_to_call', []))}] - {routing_result.get('reasoning', '')}",
            metadata={
                "routing": routing_result.get("agents_to_call", []), 
                "context": routing_result.get("conversation_context", {})
            }
        )
    
    def _is_amenity_related(self, message: str) -> bool:
        """Check if the user message is related to amenities"""
        amenity_keywords = [
            "amenity", "amenities", "feature", "features", "gym", "pool", "fitness", 
            "laundry", "washer", "dryer", "balcony", "patio", "parking", "garage",
            "pet", "dog", "cat", "appliance", "kitchen", "bathroom", "smart home"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in amenity_keywords)
    
    def _is_neighborhood_related(self, message: str) -> bool:
        """Check if the user message is related to neighborhoods"""
        neighborhood_keywords = [
            "neighborhood", "area", "location", "downtown", "midtown", "uptown",
            "heights", "montrose", "where", "live", "commute", "drive", "distance",
            "school", "district", "safe", "safety", "crime", "restaurant", "shop"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in neighborhood_keywords)
    
    def _create_routing_result(self, agents: List[str], reasoning: str, session_id: str) -> Dict:
        """Create a routing result with the given agents and reasoning"""
        current_focus = "amenity_selection" if "amenity" in agents[0] else "neighborhood_exploration"
        
        context = {
            "current_focus": current_focus,
            "user_intent": f"Completing {current_focus}",
            "next_logical_step": f"Finish {current_focus} before proceeding"
        }
        
        self.session_contexts[session_id] = context
        
        return {
            "agents_to_call": agents,
            "reasoning": reasoning,
            "conversation_context": context
        }
            
    def get_current_context(self, session_id: str) -> Dict:
        """Get the current conversation context for a session"""
        return self.session_contexts.get(session_id, {})