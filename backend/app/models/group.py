from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum

class GroupCreate(BaseModel):
    name: str
    sport: str
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    description: Optional[str] = None

class Group(BaseModel):
    id: str
    name: str
    sport: str
    description: Optional[str] = None
    inviteCode: str
    createdBy: str
    createdAt: str

class MemberRole(str, Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"

class Membership(BaseModel):
    userId: str
    groupId: str
    userName: str
    role: MemberRole
    joinedAt: str
    status: str
    balance: float = 0.0

class InviteCreate(BaseModel):
    emails: List[EmailStr]

class InviteAccept(BaseModel):
    inviteCode: str