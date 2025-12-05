from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import uuid
import json

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Dict[group_id, List[WebSocket]]
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, group_id: int):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, group_id: int):
        if group_id in self.active_connections:
            if websocket in self.active_connections[group_id]:
                self.active_connections[group_id].remove(websocket)
    
    async def broadcast_to_group(self, group_id: int, message: dict):
        if group_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[group_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for conn in disconnected:
                self.disconnect(conn, group_id)

manager = ConnectionManager()

# Request/Response Models
class MessageResponse(BaseModel):
    message_id: str
    group_id: int
    user_id: str
    user_name: str
    content: str
    created_at: str

class SendMessageRequest(BaseModel):
    content: str


@router.get("/messages", response_model=List[MessageResponse])
async def get_messages(
    limit: int = 50,
    before: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get chat messages for user's group
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get messages
        messages = db.get_group_messages(group_id, limit=limit, before=before)
        
        # Add user names
        message_list = []
        for message in messages:
            user = db.get_user_by_id(message['user_id'])
            message_list.append(MessageResponse(
                **message,
                user_name=user.get('display_name', user['email']) if user else 'Unknown'
            ))
        
        return message_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    request: SendMessageRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Send a chat message
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Validate message
        if not request.content or not request.content.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Create message
        message_id = str(uuid.uuid4())
        message_data = {
            'message_id': message_id,
            'group_id': group_id,
            'user_id': user_id,
            'content': request.content.strip(),
            'created_at': datetime.utcnow().isoformat()
        }
        
        db.create_message(message_data)
        
        # Get created message with user info
        message = db.get_message_by_id(message_id)
        user = db.get_user_by_id(user_id)
        
        response = MessageResponse(
            **message,
            user_name=user.get('display_name', user['email']) if user else 'Unknown'
        )
        
        # Broadcast to WebSocket clients
        await manager.broadcast_to_group(group_id, {
            "type": "new_message",
            "message": response.dict()
        })
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete a message (author or admin only)
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # Get message
        message = db.get_message_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Verify message belongs to user's group
        if message['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check permissions (admin or author)
        if not is_admin and message['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Delete message
        db.delete_message(message_id)
        
        # Broadcast deletion to WebSocket clients
        await manager.broadcast_to_group(group_id, {
            "type": "message_deleted",
            "message_id": message_id
        })
        
        return {"ok": True, "message": "Message deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time chat
    Connect with: ws://localhost:8000/api/chat/ws?token=<jwt_token>
    """
    try:
        # Verify token and get user
        import jwt
        from app.config import settings
        
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get('user_id')
            group_id = payload.get('group_id')
            
            if not user_id or not group_id:
                await websocket.close(code=1008, reason="Invalid token")
                return
        except jwt.JWTError:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Connect to WebSocket
        await manager.connect(websocket, group_id)
        
        try:
            # Send connection confirmation
            await websocket.send_json({
                "type": "connected",
                "group_id": group_id,
                "user_id": user_id
            })
            
            # Listen for messages
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                
                try:
                    message_data = json.loads(data)
                    
                    # Handle different message types
                    if message_data.get('type') == 'send_message':
                        content = message_data.get('content', '').strip()
                        
                        if content:
                            db = get_db_service()
                            
                            # Create message
                            message_id = str(uuid.uuid4())
                            new_message = {
                                'message_id': message_id,
                                'group_id': group_id,
                                'user_id': user_id,
                                'content': content,
                                'created_at': datetime.utcnow().isoformat()
                            }
                            
                            db.create_message(new_message)
                            
                            # Get user info
                            user = db.get_user_by_id(user_id)
                            
                            # Broadcast to all group members
                            await manager.broadcast_to_group(group_id, {
                                "type": "new_message",
                                "message": {
                                    **new_message,
                                    "user_name": user.get('display_name', user['email']) if user else 'Unknown'
                                }
                            })
                    
                    elif message_data.get('type') == 'typing':
                        # Broadcast typing indicator
                        db = get_db_service()
                        user = db.get_user_by_id(user_id)
                        
                        await manager.broadcast_to_group(group_id, {
                            "type": "user_typing",
                            "user_id": user_id,
                            "user_name": user.get('display_name', user['email']) if user else 'Unknown'
                        })
                
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid message format"
                    })
        
        except WebSocketDisconnect:
            manager.disconnect(websocket, group_id)
            
            # Broadcast user disconnected
            await manager.broadcast_to_group(group_id, {
                "type": "user_disconnected",
                "user_id": user_id
            })
    
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass