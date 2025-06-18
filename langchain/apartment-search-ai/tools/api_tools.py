from langchain.tools import BaseTool
import requests
import json
import os
from typing import Optional, Any

class APIBaseTool(BaseTool):
    name: str = ""
    description: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set this directly as a Python attribute rather than a Pydantic field
        base_url = os.getenv("BASE_API_URL", "https://houstontexasapartments.com/api")
        
        # Ensure URL has http:// prefix
        if not base_url.startswith(('http://', 'https://')):
            base_url = 'http://' + base_url
            
        self._base_url = base_url
    
    def _make_request(self, method: str, endpoint: str, params: Optional[dict] = None, data: Optional[dict] = None):
        url = f"{self._base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, params=params)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, params=params)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, params=params)
            
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": str(e)}

class GetUserProfileTool(APIBaseTool):
    name: str = "get_user_profile"
    description: str = "Get current user profile and preferences by email"
    
    def _run(self, email: str) -> str:
        result = self._make_request("GET", "/user/profile-preferences", params={"email": email})
        return json.dumps(result)

class UpdateUserProfileTool(APIBaseTool):
    name: str = "update_user_profile"
    description: str = "Update user profile with new preferences"
    
    def _run(self, email: str, profile_data: str) -> str:
        data = json.loads(profile_data)
        result = self._make_request("PUT", "/user/preferences", params={"email": email}, data=data)
        return json.dumps(result)

class SearchApartmentsTool(APIBaseTool):
    name: str = "search_apartments"
    description: str = "Search for apartments based on criteria"
    
    def _run(self, search_criteria: str) -> str:
        criteria = json.loads(search_criteria)
        result = self._make_request("GET", "/apartments/search", params=criteria)
        return json.dumps(result)

class GetNeighborhoodsTool(APIBaseTool):
    name: str = "get_neighborhoods"
    description: str = "Get list of all available neighborhoods"
    
    def _run(self) -> str:
        result = self._make_request("GET", "/neighborhoods")
        return json.dumps(result)

class GetNeighborhoodInfoTool(APIBaseTool):
    name: str = "get_neighborhood_info"
    description: str = "Get detailed blog posts and info about a specific neighborhood"
    
    def _run(self, neighborhood_id: str) -> str:
        result = self._make_request("GET", f"/neighborhoods/{neighborhood_id}/blog-posts")
        return json.dumps(result)

class GetAmenitiesTool(APIBaseTool):
    name: str = "get_amenities"
    description: str = "Get list of all available amenities"
    
    def _run(self) -> str:
        result = self._make_request("GET", "/amenities")
        return json.dumps(result)