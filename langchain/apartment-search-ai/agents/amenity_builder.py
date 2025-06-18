from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from tools.api_tools import GetUserProfileTool, UpdateUserProfileTool, GetAmenitiesTool
from models.data_models import ChatContext, AgentResponse, UserProfile
from models.memory_store import AgentMemoryManager
import json
from typing import List, Dict, Any

class AmenityBuilderAgent:
    def __init__(self, llm: ChatOpenAI):
        self.llm = llm
        self.tools = [
            GetUserProfileTool(),
            UpdateUserProfileTool(),
            GetAmenitiesTool()
        ]
        
        # Initialize memory manager
        self.memory_manager = AgentMemoryManager(agent_name="amenity_builder")
        
        # Track current amenity category for each session
        self.session_categories = {}
        
        # Define amenity categories in a specific order
        self.amenity_categories = [
            "apartment_interior",
            "smart_sustainable", 
            "outdoor_relaxation",
            "fitness_wellness",
            "work_productivity",
            "resident_services",
            "transportation",
            "review_finalize"
        ]
        
        # Map of category details
        self.category_details = {
            "apartment_interior": {
                "name": "Apartment Interior Features",
                "description": "Features that enhance your living space, kitchen, and bathroom.",
                "examples": ["Kitchen Appliances", "In-Unit Laundry", "Walk-In Closet", "Flooring", "Ceiling Height"]
            },
            "smart_sustainable": {
                "name": "Smart & Sustainable Living",
                "description": "Tech features and eco-friendly options for modern living.",
                "examples": ["Smart Home & Connectivity", "Energy & Green Features", "Surround Sound"]
            },
            "outdoor_relaxation": {
                "name": "Outdoor & Relaxation Spaces",
                "description": "Private and shared outdoor spaces for relaxation and socializing.",
                "examples": ["Private Patio/Balcony", "Sky Deck", "Unit Views", "Pet Park"]
            },
            "fitness_wellness": {
                "name": "Fitness & Wellness",
                "description": "Amenities for staying active and healthy within your community.",
                "examples": ["Gym / Fitness Center", "Swimming Pool", "Yoga Studio", "Tennis Court"]
            },
            "work_productivity": {
                "name": "Work & Productivity",
                "description": "Spaces designed for remote work or business needs.",
                "examples": ["Meeting Space", "Business Center"]
            },
            "resident_services": {
                "name": "Resident Services & Convenience",
                "description": "Services that make everyday life easier and more convenient.",
                "examples": ["Concierge Service", "Package Lockers", "Valet Trash", "Housekeeping"]
            },
            "transportation": {
                "name": "Transportation & Parking",
                "description": "Options for vehicle owners, cyclists, and commuters.",
                "examples": ["Parking Garage", "EV Charging Stations", "Bike Storage"]
            },
            "review_finalize": {
                "name": "Review & Finalize Amenities",
                "description": "Review all selected amenities and finalize your preferences.",
                "examples": []
            }
        }
        
        self.system_prompt = """
        You are the Amenity Selection Specialist for HTXapt.com apartment rental platform.
        
        GOAL: Guide users step-by-step through selecting their preferred amenities by category.
        
        KEY PRINCIPLES:
        1. Focus on ONE amenity category at a time
        2. Clearly state which category we're currently discussing
        3. Explain the benefits of amenities in each category
        4. Provide a structured, methodical approach
        5. Show progress (e.g., "Category 3 of 7: Outdoor Spaces")
        6. Only move to the next category when the current one is complete
        
        AMENITY CATEGORIES:
        1. 🏠 Apartment Interior Features - Kitchen, bathroom, living space features
        2. 🌐 Smart & Sustainable Living - Tech and eco-friendly features
        3. 🌳 Outdoor & Relaxation Spaces - Balconies, views, outdoor areas
        4. 🏋️‍♀️ Fitness & Wellness - Gym, pool, sports facilities
        5. 👔 Work & Productivity - Meeting spaces, business center
        6. 🛎️ Resident Services - Concierge, package service, housekeeping
        7. 🚗 Transportation & Parking - Parking options, EV charging, bike storage
        
        CONVERSATION APPROACH:
        - Start with introducing the current category
        - Explain what amenities are in this category and their benefits
        - Ask specific questions about their preferences in this category
        - Confirm selections before moving to the next category
        - When all categories are complete, provide a summary
        
        Always verify amenities against the available list.
        
        Response format:
        {
            "response": "Your step-by-step conversational response",
            "updatedUserProfile": {updated profile with amenities},
            "selectedAmenities": ["list of selected amenities"],
            "currentCategory": "category_id",
            "completedCategories": ["list of completed category_ids"],
            "progress": "3/7 categories completed",
            "isComplete": false,
            "handoffTo": null or "profile_builder",
            "nextCategory": "next_category_id or null if complete"
        }
        """
    
    def process_message(self, context: ChatContext) -> AgentResponse:
        # Get available amenities
        amenities_json = self.tools[2]._run()
        try:
            available_amenities = json.loads(amenities_json)
        except:
            available_amenities = {"amenities": []}
        
        # Extract current amenities from user profile
        current_amenities = []
        if context.currentProfile and hasattr(context.currentProfile, "requiredAmenities"):
            current_amenities = context.currentProfile.requiredAmenities
        
        # Get current category for this session
        session_id = context.sessionId
        
        # Track completed categories
        completed_categories = self.session_categories.get(session_id, {}).get("completed", [])
        
        # Determine current category
        current_category = self.session_categories.get(session_id, {}).get("current", "apartment_interior")
        
        # If all categories are completed, set to review
        if len(completed_categories) >= len(self.amenity_categories) - 1:
            current_category = "review_finalize"
            
        # Get category details
        category_info = self.category_details[current_category]
        
        # Get chat history for this session
        chat_history = self.memory_manager.get_chat_history(session_id, k=8)  # Last 8 exchanges
        
        # Save the user message to memory
        self.memory_manager.add_user_message(
            session_id=session_id,
            message=context.chatInput,
            metadata={
                "email": context.email, 
                "currentCategory": current_category,
                "completedCategories": completed_categories
            }
        )
        
        prompt = f"""
        User Message: {context.chatInput}
        Current Profile: {context.currentProfile.dict() if context.currentProfile else "New user - empty profile"}
        Current Amenities: {current_amenities}
        Available Amenities: {amenities_json}
        
        CURRENT AMENITY CATEGORY: {category_info['name']}
        Category Description: {category_info['description']}
        Example Amenities: {', '.join(category_info['examples'])}
        
        Progress: Category {self.amenity_categories.index(current_category) + 1} of {len(self.amenity_categories)}
        Completed Categories: {', '.join([self.category_details[cat]['name'] for cat in completed_categories])}
        
        Chat History:
        {chat_history}
        
        Guide the user step-by-step through selecting amenities in the current category.
        Be clear about which category we're discussing and what comes next.
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
                "currentCategory": agent_response.metadata.get("currentCategory", "apartment_interior"),
                "progress": agent_response.metadata.get("progress", "")
            }
        )
        
        return agent_response
    
    def _parse_response(self, response_content: str, context: ChatContext) -> AgentResponse:
        try:
            parsed = json.loads(response_content)
            
            # Update profile if amenities were selected
            if parsed.get("updatedUserProfile") and context.email:
                self.tools[1]._run(
                    context.email,
                    json.dumps(parsed["updatedUserProfile"])
                )
            
            # Update session tracking for categories
            session_id = context.sessionId
            
            # Get current category data or initialize
            category_data = self.session_categories.get(session_id, {"current": "apartment_interior", "completed": []})
            
            # Update current category if changed in response
            if parsed.get("currentCategory"):
                category_data["current"] = parsed.get("currentCategory")
                
            # Update completed categories
            if parsed.get("completedCategories"):
                category_data["completed"] = parsed.get("completedCategories")
                
            # Move to next category if specified
            if parsed.get("nextCategory"):
                category_data["current"] = parsed.get("nextCategory")
                if parsed.get("currentCategory") and parsed.get("currentCategory") not in category_data["completed"]:
                    category_data["completed"].append(parsed.get("currentCategory"))
                    
            # Save updated category data
            self.session_categories[session_id] = category_data
            
            # Determine if we should hand off back to profile builder
            is_handoff = parsed.get("handoffTo") is not None or parsed.get("isComplete", False)
            
            return AgentResponse(
                response=parsed.get("response", ""),
                isHandOff=is_handoff,
                agent_name="amenity_builder",
                confidence_score=0.9,
                next_actions=[parsed.get("handoffTo")] if parsed.get("handoffTo") else [],
                metadata={
                    "selectedAmenities": parsed.get("selectedAmenities", []),
                    "currentCategory": parsed.get("currentCategory", "apartment_interior"),
                    "progress": parsed.get("progress", ""),
                    "isComplete": parsed.get("isComplete", False)
                }
            )
        except Exception as e:
            print(f"Error parsing amenity builder response: {e}")
            return AgentResponse(
                response=response_content,
                isHandOff=True,
                agent_name="amenity_builder",
                confidence_score=0.5,
                next_actions=["profile_builder"]
            )
    
    def _validate_amenities(self, selected_amenities: List[str], available_amenities: List[Dict[str, Any]]) -> List[str]:
        """Validate that selected amenities exist in the available list"""
        available_names = [a.get("name", "").lower() for a in available_amenities]
        
        # Filter out invalid amenities
        valid_amenities = [a for a in selected_amenities if a.lower() in available_names]
        
        return valid_amenities
        
    def get_current_category(self, session_id: str) -> str:
        """Get the current amenity category for a session"""
        return self.session_categories.get(session_id, {}).get("current", "apartment_interior")
        
    def is_amenity_selection_complete(self, session_id: str) -> bool:
        """Check if amenity selection is complete for this session"""
        completed = self.session_categories.get(session_id, {}).get("completed", [])
        return len(completed) >= len(self.amenity_categories) - 1  # All except review_finalize 