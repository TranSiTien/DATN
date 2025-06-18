from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from tools.api_tools import SearchApartmentsTool
from models.data_models import ChatContext, AgentResponse
from models.memory_store import AgentMemoryManager
import json
from typing import Dict, List, Any, Optional

class ApartmentSearchAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.tools = [
            SearchApartmentsTool()
        ]
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="apartment_search")
        
        self.system_prompt = """
        You are Binh, the Apartment Search Specialist at HTXapt.com.
        
        EXPERTISE:
        - Searching for apartments matching user preferences
        - Presenting options clearly with pros/cons
        - Explaining apartment features and amenities
        - Helping users compare and evaluate options
        - Recommending properties based on budget, location, and lifestyle
        
        SEARCH PROCESS:
        1. Check that you have enough information to search effectively
        2. Translate user needs into search criteria
        3. Search for matching apartments
        4. Present results in a clear, organized way
        5. Recommend top choices with reasoning
        6. Suggest refinements if needed
        
        REQUIRED INFORMATION:
        - Budget range (min/max)
        - Bedrooms (min/max)
        - Location preferences
        
        HELPFUL ADDITIONAL INFO:
        - Bathrooms (min/max)
        - Square footage (min/max)
        - Move-in date
        - Must-have amenities
        - Deal-breakers
        
        Always verify you have sufficient information before searching.
        If profile is incomplete, ask for missing information first.
        
        Response format:
        {
            "response": "Your conversational response about apartment options",
            "isReadyToSearch": true,
            "searchCriteria": {search parameters as json},
            "recommendedOptions": [list of best matches with reasoning],
            "suggestionToRefine": "Any suggestion to refine search criteria",
            "confidence_score": 0.9
        }
        """
    
    def process_message(self, context: ChatContext) -> AgentResponse:
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
        
        # Check if we can search based on profile completeness
        can_search, missing_elements = self._can_search(context.currentProfile)
        
        prompt = f"""
        User Message: {context.chatInput}
        User Profile: {context.currentProfile.dict() if context.currentProfile else "No profile"}
        Can Search: {"Yes" if can_search else "No - missing: " + ", ".join(missing_elements)}
        
        Chat History:
        {chat_history}
        
        Help the user find apartments matching their preferences.
        """
        
        # If we can search, do a search first
        search_results = "No search performed yet."
        if can_search:
            search_criteria = self._create_search_criteria(context.currentProfile)
            try:
                results = self.tools[0]._run(json.dumps(search_criteria))
                search_results = f"Search Results: {results}"
            except Exception as e:
                search_results = f"Search Error: {str(e)}"
        
        # Add search results to prompt if available
        if search_results != "No search performed yet.":
            prompt += f"\n\n{search_results}"
        
        response = self.llm.invoke([
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=prompt)
        ])
        
        agent_response = self._parse_response(response.content)
        
        # Save the AI response to memory
        self.memory_manager.add_ai_message(
            session_id=session_id,
            message=agent_response.response,
            metadata={
                "isReadyToSearch": agent_response.metadata.get("isReadyToSearch", False),
                "searchCriteria": agent_response.metadata.get("searchCriteria", {})
            }
        )
        
        return agent_response
    
    def _can_search(self, profile) -> tuple[bool, list[str]]:
        """Check if we have enough information to search"""
        if not profile:
            return False, ["All profile information"]
            
        missing_elements = []
        
        # Check required fields
        if not getattr(profile, "minBudget", None) or not getattr(profile, "maxBudget", None):
            missing_elements.append("Budget range")
        
        if not getattr(profile, "minBeds", None) or not getattr(profile, "maxBeds", None):
            missing_elements.append("Bedroom preferences")
        
        return len(missing_elements) == 0, missing_elements
    
    def _create_search_criteria(self, profile) -> Dict[str, Any]:
        """Create search criteria from profile"""
        criteria = {}
        
        # Add basic criteria
        if getattr(profile, "minBudget", None):
            criteria["minPrice"] = profile.minBudget
        
        if getattr(profile, "maxBudget", None):
            criteria["maxPrice"] = profile.maxBudget
        
        if getattr(profile, "minBeds", None):
            criteria["minBeds"] = profile.minBeds
        
        if getattr(profile, "maxBeds", None):
            criteria["maxBeds"] = profile.maxBeds
        
        if getattr(profile, "minBaths", None):
            criteria["minBaths"] = profile.minBaths
        
        if getattr(profile, "maxBaths", None):
            criteria["maxBaths"] = profile.maxBaths
        
        if getattr(profile, "minSqft", None):
            criteria["minSqft"] = profile.minSqft
        
        if getattr(profile, "maxSqft", None):
            criteria["maxSqft"] = profile.maxSqft
        
        # Add neighborhoods
        if getattr(profile, "preferredNeighborhoods", None) and len(profile.preferredNeighborhoods) > 0:
            criteria["neighborhoods"] = [n.get("id") for n in profile.preferredNeighborhoods if "id" in n]
        
        # Add amenities
        if getattr(profile, "requiredAmenities", None) and len(profile.requiredAmenities) > 0:
            criteria["amenities"] = [a.get("id") for a in profile.requiredAmenities if "id" in a]
        
        return criteria
    
    def _parse_response(self, response_content: str) -> AgentResponse:
        """Parse the LLM response"""
        try:
            parsed = json.loads(response_content)
            return AgentResponse(
                response=parsed.get("response", ""),
                isHandOff=False,
                agent_name="apartment_search",
                confidence_score=parsed.get("confidence_score", 0.9),
                metadata=parsed
            )
        except Exception as e:
            print(f"Error parsing apartment search response: {e}")
            return AgentResponse(
                response=response_content,
                isHandOff=False,
                agent_name="apartment_search",
                confidence_score=0.7
            )