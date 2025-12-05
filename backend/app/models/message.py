from pydantic import BaseModel

class MessageCreate(BaseModel):
    content: str

class Message(BaseModel):
    id: str
    groupId: str
    userId: str
    userName: str
    content: str
    createdAt: str