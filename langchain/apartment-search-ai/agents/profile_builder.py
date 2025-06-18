from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from tools.api_tools import GetUserProfileTool, UpdateUserProfileTool, GetNeighborhoodsTool, GetAmenitiesTool
from models.data_models import ChatContext, AgentResponse
from models.memory_store import AgentMemoryManager
import json
from typing import List, Dict, Optional

class ProfileBuilderAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.tools = [
            GetUserProfileTool(),
            UpdateUserProfileTool(),
            GetNeighborhoodsTool(),
            GetAmenitiesTool()
        ]
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="profile_builder")
        
        # Track profile building stages
        self.building_stages = [
            "introduction",  # Initial greeting and explanation
            "budget",        # Budget preferences
            "size",          # Bedrooms, bathrooms, square footage
            "timeline",      # Move-in date and urgency
            "location",      # Neighborhood preferences
            "amenities",     # Desired amenities
            "review"         # Review and confirm profile
        ]
        
        # Track the current stage for each session
        self.session_stages = {}
        
        self.system_prompt = """
        You are Đỉnh, the friendly Guest Relations Concierge at HTXapt.com.
        
        GOAL: Help users build comprehensive apartment preferences through natural conversation.
        
        KEY AREAS TO EXPLORE:
        1. Budget (minBudget, maxBudget)
        2. Size (minBeds, maxBeds, minBaths, maxBaths, minSqft, maxSqft)
        3. Timeline (moveInDate)
        4. Amenities (from available list only)
        5. Neighborhoods (from available list only)
        6. Lifestyle needs and context
        
        CONVERSATION STYLE:
        - Warm, empathetic, patient
        - Ask 1-2 questions at a time, don't overwhelm
        - Build on their responses naturally
        - Provide guidance and recommendations
        - Help them think through what they actually need vs want
        
        PROFILE BUILDING STAGES:
        - Always tell the user what stage of profile building they're in
        - Clearly indicate what information is still missing
        - Focus on one area at a time before moving to the next
        - Recommend specialized help for neighborhoods and amenities when appropriate
        
        Always validate amenities and neighborhoods against available lists.
        Update profile incrementally as you learn more.
        
        Response format:
        {
            "response": "Your conversational response",
            "isHandOff": false,
            "updatedUserProfile": {updated_profile_object},
            "profileStage": "budget|size|timeline|location|amenities|review",
            "missingElements": ["list of missing profile elements"],
            "recommendSpecialist": null or "neighborhood_expert"|"amenity_builder",
            "confidenceScore": 0.8
        }
        """
    
    def process_message(self, context: ChatContext) -> AgentResponse:
        # Get current reference data
        available_amenities = self.tools[3]._run()
        available_neighborhoods = self.tools[2]._run()
        
        # Get current building stage for this session
        session_id = context.sessionId
        current_stage = self.session_stages.get(session_id, "introduction")
        
        # Analyze missing profile elements
        missing_elements = self._identify_missing_elements(context.currentProfile)
        
        # Get chat history for this session
        chat_history = self.memory_manager.get_chat_history(session_id, k=8)  # Last 8 exchanges
        
        # Save the user message to memory
        self.memory_manager.add_user_message(
            session_id=session_id,
            message=context.chatInput,
            metadata={"email": context.email, "stage": current_stage}
        )
        
        prompt = f"""
        User Message: {context.chatInput}
        Current Profile: {context.currentProfile.dict() if context.currentProfile else "New user - empty profile"}
        Current Building Stage: {current_stage}
        Missing Elements: {missing_elements}
        Available Amenities: {available_amenities}
        Available Neighborhoods: {available_neighborhoods}
        
        Chat History:
        {chat_history}
        
        Help build their apartment preferences naturally.
        Remember to clearly indicate what stage of profile building they're in now.
        """
        
        response = self.llm.invoke([
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=prompt)
        ])
        
        agent_response = self._parse_response(response.content, context)
        
        # Save the AI response to memory
        self.memory_manager.add_ai_message(
            session_id=session_id,
            message=agent_response.response,
            metadata={
                "profileStage": agent_response.metadata.get("profileStage", "introduction"),
                "missingElements": agent_response.metadata.get("missingElements", [])
            }
        )
        
        return agent_response
    
    def _parse_response(self, response_content: str, context: ChatContext) -> AgentResponse:
        try:
            parsed = json.loads(response_content)
            
            # Update profile if changes were made
            if parsed.get("updatedUserProfile"):
                self.tools[1]._run(
                    context.email,
                    json.dumps(parsed["updatedUserProfile"])
                )
            
            # Update the current building stage for this session
            if parsed.get("profileStage"):
                self.session_stages[context.sessionId] = parsed["profileStage"]
                
            # Determine if we should hand off to a specialist
            is_handoff = parsed.get("recommendSpecialist") is not None
            specialist = parsed.get("recommendSpecialist")
            
            return AgentResponse(
                response=parsed.get("response", ""),
                isHandOff=is_handoff,
                agent_name="profile_builder",
                confidence_score=parsed.get("confidenceScore", 0.8),
                next_actions=[specialist] if specialist else [],
                metadata={
                    "profileStage": parsed.get("profileStage", "introduction"),
                    "missingElements": parsed.get("missingElements", []),
                    "updatedProfile": parsed.get("updatedUserProfile", {})
                }
            )
        except Exception as e:
            print(f"Error parsing profile builder response: {e}")
            return AgentResponse(
                response=response_content,
                isHandOff=False,
                agent_name="profile_builder",
                confidence_score=0.5
            )
    
    def _identify_missing_elements(self, profile) -> List[str]:
        """Identify missing elements in the user profile"""
        if not profile:
            return ["All profile information"]
            
        missing_elements = []
        
        # Essential information (highest priority)
        if not getattr(profile, "minBudget", None) or not getattr(profile, "maxBudget", None):
            missing_elements.append("Budget range")
        
        if not getattr(profile, "minBeds", None) or not getattr(profile, "maxBeds", None):
            missing_elements.append("Bedroom preferences")
        
        # Important information (medium priority)
        if not getattr(profile, "moveInDate", None):
            missing_elements.append("Move-in timeline")
            
        if not getattr(profile, "minBaths", None) or not getattr(profile, "maxBaths", None):
            missing_elements.append("Bathroom preferences")
            
        if not getattr(profile, "minSqft", None) or not getattr(profile, "maxSqft", None):
            missing_elements.append("Square footage preferences")
            
        # Preferences (lower priority but important for matching)
        if not getattr(profile, "preferredNeighborhoods", None) or len(getattr(profile, "preferredNeighborhoods", [])) == 0:
            missing_elements.append("Neighborhood preferences")
            
        if not getattr(profile, "requiredAmenities", None) or len(getattr(profile, "requiredAmenities", [])) == 0:
            missing_elements.append("Amenity preferences")
            
        return missing_elements
        
    def get_current_stage(self, session_id: str) -> str:
        """Get the current profile building stage for a session"""
        return self.session_stages.get(session_id, "introduction")