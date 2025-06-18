from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime

class UserProfile(BaseModel):
    id: Optional[int] = None
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    minBudget: Optional[int] = None
    maxBudget: Optional[int] = None
    minBeds: Optional[int] = None
    maxBeds: Optional[int] = None
    bedType: str = "bedrooms"
    minBaths: Optional[int] = None
    maxBaths: Optional[int] = None
    minSqft: Optional[int] = None
    maxSqft: Optional[int] = None
    moveInDate: Optional[str] = None
    contactPreference: str = "email"
    isUserFeelFineWithProfilePreferences: bool = False
    requiredAmenities: List[Dict] = Field(default_factory=list)
    preferredNeighborhoods: List[Dict] = Field(default_factory=list)

class ChatContext(BaseModel):
    sessionId: str
    email: str
    chatInput: str
    currentProfile: Optional[UserProfile] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class AgentResponse(BaseModel):
    response: str
    isHandOff: bool = False
    agent_name: str
    confidence_score: float = 1.0
    next_actions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)