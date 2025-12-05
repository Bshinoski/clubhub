from pydantic import BaseModel
from typing import Optional
from enum import Enum

class EventType(str, Enum):
    PRACTICE = "PRACTICE"
    GAME = "GAME"
    MEETING = "MEETING"
    OTHER = "OTHER"

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str  # ISO format date
    time: str
    location: Optional[str] = None
    type: EventType

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    type: Optional[EventType] = None

class Event(BaseModel):
    id: str
    groupId: str
    title: str
    description: Optional[str] = None
    date: str
    time: str
    location: Optional[str] = None
    type: EventType
    createdBy: str
    createdAt: str