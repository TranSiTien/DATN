from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from tools.api_tools import GetNeighborhoodsTool, GetNeighborhoodInfoTool, UpdateUserProfileTool
from models.data_models import ChatContext, AgentResponse
from models.memory_store import AgentMemoryManager
import json
from typing import List, Dict, Any

class NeighborhoodExpertAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.tools = [
            GetNeighborhoodsTool(),
            GetNeighborhoodInfoTool(),
            UpdateUserProfileTool()
        ]
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="neighborhood_expert")
        
        # Track exploration stages for each session
        self.session_stages = {}
        
        # Define neighborhood exploration stages
        self.exploration_stages = [
            "lifestyle_assessment",   # Understand user's lifestyle needs
            "area_introduction",      # Introduce Houston areas broadly
            "neighborhood_options",   # Present specific neighborhood options
            "detailed_exploration",   # Explore selected neighborhoods in detail
            "preference_selection",   # Select preferred neighborhoods
            "finalize_preferences"    # Finalize neighborhood preferences
        ]
        
        self.system_prompt = """
        You are Lam, the neighborhood expert for Houston at HTXapt.com.
        
        GOAL: Guide users step-by-step through exploring and selecting Houston neighborhoods that match their lifestyle.
        
        EXPERTISE AREAS:
        - Houston neighborhoods (Heights, Neartown, Downtown, Midtown, Uptown, etc.)
        - Lifestyle characteristics and demographics
        - Transportation and commute patterns
        - Local amenities, dining, entertainment
        - Safety and community atmosphere
        - Cost of living variations
        - Best fit for different lifestyles
        
        STEP-BY-STEP APPROACH:
        1. LIFESTYLE ASSESSMENT - Understand their priorities (commute, nightlife, family-friendly, etc.)
        2. AREA INTRODUCTION - Introduce general Houston areas relevant to their needs
        3. NEIGHBORHOOD OPTIONS - Present 3-5 specific neighborhoods that match their priorities
        4. DETAILED EXPLORATION - Provide in-depth information about neighborhoods they're interested in
        5. PREFERENCE SELECTION - Help them select and rank their preferred neighborhoods
        6. FINALIZE PREFERENCES - Confirm selections and update their profile
        
        CONVERSATION STYLE:
        - Clearly state which exploration stage we're in
        - Focus on one stage at a time
        - Show progress (e.g., "Step 3 of 6: Exploring Neighborhood Options")
        - Use specific neighborhood data and blog posts when available
        - Ask focused questions that help narrow down options
        
        Always verify neighborhoods against the available list.
        
        Response format:
        {
            "response": "Your step-by-step neighborhood guidance",
            "currentStage": "stage_id",
            "completedStages": ["list of completed stage_ids"],
            "progress": "3/6 stages completed",
            "suggestedNeighborhoods": [
                {"id": 1, "name": "Downtown", "reason": "Great for urban lifestyle with short commute"}
            ],
            "updatedUserProfile": null or {updated profile with neighborhood preferences},
            "isComplete": false,
            "handoffTo": null or "profile_builder",
            "nextStage": "next_stage_id or null if complete"
        }
        """
    
    def process_message(self, context: ChatContext) -> AgentResponse:
        # Get all neighborhoods data
        neighborhoods_data = self.tools[0]._run()
        
        # Get current stage for this session
        session_id = context.sessionId
        
        # Track completed stages
        completed_stages = self.session_stages.get(session_id, {}).get("completed", [])
        
        # Determine current stage
        current_stage = self.session_stages.get(session_id, {}).get("current", "lifestyle_assessment")
        
        # If all stages are completed, set to finalize
        if len(completed_stages) >= len(self.exploration_stages) - 1:
            current_stage = "finalize_preferences"
        
        # Get specific neighborhood info if they mentioned one
        neighborhood_details = ""
        if self._mentions_specific_neighborhood(context.chatInput):
            neighborhood_id = self._extract_neighborhood_id(context.chatInput, neighborhoods_data)
            if neighborhood_id:
                neighborhood_details = self.tools[1]._run(str(neighborhood_id))
        
        # Extract current neighborhood preferences
        current_preferences = []
        if context.currentProfile and hasattr(context.currentProfile, "preferredNeighborhoods"):
            current_preferences = context.currentProfile.preferredNeighborhoods
        
        # Get chat history for this session
        chat_history = self.memory_manager.get_chat_history(session_id, k=8)  # Last 8 exchanges
        
        # Save the user message to memory
        self.memory_manager.add_user_message(
            session_id=session_id,
            message=context.chatInput,
            metadata={
                "email": context.email, 
                "currentStage": current_stage,
                "completedStages": completed_stages
            }
        )
        
        prompt = f"""
        User Message: {context.chatInput}
        User Profile: {context.currentProfile.dict() if context.currentProfile else "No profile"}
        Current Neighborhood Preferences: {current_preferences}
        Available Neighborhoods: {neighborhoods_data}
        Specific Neighborhood Details: {neighborhood_details}
        
        CURRENT EXPLORATION STAGE: {current_stage}
        Progress: Step {self.exploration_stages.index(current_stage) + 1} of {len(self.exploration_stages)}
        Completed Stages: {', '.join(completed_stages)}
        
        Chat History:
        {chat_history}
        
        Guide the user step-by-step through the current stage of neighborhood exploration.
        Be clear about which stage we're in and what comes next.
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
                "currentStage": agent_response.metadata.get("currentStage", "lifestyle_assessment"),
                "progress": agent_response.metadata.get("progress", "")
            }
        )
        
        return agent_response
    
    def _mentions_specific_neighborhood(self, message: str) -> bool:
        # Simple check for neighborhood mentions
        neighborhoods = ["heights", "downtown", "midtown", "uptown", "neartown", "montrose", "museum district", "rice", "medical center"]
        return any(hood in message.lower() for hood in neighborhoods)
    
    def _extract_neighborhood_id(self, message: str, neighborhoods_data: str) -> int:
        # Extract neighborhood ID from data based on message content
        try:
            neighborhoods = json.loads(neighborhoods_data)
            message_lower = message.lower()
            for hood in neighborhoods:
                if hood['name'].lower() in message_lower:
                    return hood['id']
        except:
            pass
        return None
    
    def _parse_response(self, response_content: str, context: ChatContext) -> AgentResponse:
        try:
            parsed = json.loads(response_content)
            
            # Update profile if neighborhood preferences were selected
            if parsed.get("updatedUserProfile") and context.email:
                self.tools[2]._run(
                    context.email,
                    json.dumps(parsed["updatedUserProfile"])
                )
            
            # Update session tracking for stages
            session_id = context.sessionId
            
            # Get current stage data or initialize
            stage_data = self.session_stages.get(session_id, {"current": "lifestyle_assessment", "completed": []})
            
            # Update current stage if changed in response
            if parsed.get("currentStage"):
                stage_data["current"] = parsed.get("currentStage")
                
            # Update completed stages
            if parsed.get("completedStages"):
                stage_data["completed"] = parsed.get("completedStages")
                
            # Move to next stage if specified
            if parsed.get("nextStage"):
                stage_data["current"] = parsed.get("nextStage")
                if parsed.get("currentStage") and parsed.get("currentStage") not in stage_data["completed"]:
                    stage_data["completed"].append(parsed.get("currentStage"))
                    
            # Save updated stage data
            self.session_stages[session_id] = stage_data
            
            # Determine if we should hand off back to profile builder
            is_handoff = parsed.get("handoffTo") is not None or parsed.get("isComplete", False)
            
            return AgentResponse(
                response=parsed.get("response", ""),
                isHandOff=is_handoff,
                agent_name="neighborhood_expert",
                confidence_score=0.9,
                next_actions=[parsed.get("handoffTo")] if parsed.get("handoffTo") else [],
                metadata={
                    "suggestedNeighborhoods": parsed.get("suggestedNeighborhoods", []),
                    "currentStage": parsed.get("currentStage", "lifestyle_assessment"),
                    "progress": parsed.get("progress", ""),
                    "isComplete": parsed.get("isComplete", False)
                }
            )
        except Exception as e:
            print(f"Error parsing neighborhood expert response: {e}")
            return AgentResponse(
                response=response_content,
                isHandOff=False,
                agent_name="neighborhood_expert",
                confidence_score=0.7
            )
            
    def get_current_stage(self, session_id: str) -> str:
        """Get the current neighborhood exploration stage for a session"""
        return self.session_stages.get(session_id, {}).get("current", "lifestyle_assessment")
        
    def is_neighborhood_selection_complete(self, session_id: str) -> bool:
        """Check if neighborhood selection is complete for this session"""
        completed = self.session_stages.get(session_id, {}).get("completed", [])
        return len(completed) >= len(self.exploration_stages) - 1  # All except finalize_preferences