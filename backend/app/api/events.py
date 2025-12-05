from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# Request/Response Models
class EventResponse(BaseModel):
    event_id: str
    group_id: int
    title: str
    description: Optional[str] = None
    event_date: str
    event_time: str
    location: Optional[str] = None
    event_type: str  # PRACTICE, GAME, MEETING, OTHER
    created_by: str
    created_at: str

class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str  # YYYY-MM-DD
    event_time: str  # HH:MM
    location: Optional[str] = None
    event_type: str = "PRACTICE"  # PRACTICE, GAME, MEETING, OTHER

class UpdateEventRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    location: Optional[str] = None
    event_type: Optional[str] = None


@router.get("/", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get all events for user's group with optional filtering
    """
    try:
        db = get_db_service()
        
        # Get user's group
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get events with filters
        events = db.get_group_events(
            group_id,
            start_date=start_date,
            end_date=end_date,
            event_type=event_type
        )
        
        return [EventResponse(**event) for event in events]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming", response_model=List[EventResponse])
async def get_upcoming_events(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get upcoming events for user's group
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        today = datetime.utcnow().date().isoformat()
        
        events = db.get_group_events(
            group_id,
            start_date=today,
            limit=limit
        )
        
        return [EventResponse(**event) for event in events]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get specific event details
    """
    try:
        db = get_db_service()
        
        # Get user's group
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get event
        event = db.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Verify event belongs to user's group
        if event['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return EventResponse(**event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=EventResponse)
async def create_event(
    request: CreateEventRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create new event (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Validate event type
        valid_types = ['PRACTICE', 'GAME', 'MEETING', 'OTHER']
        if request.event_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid event type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Create event
        event_id = str(uuid.uuid4())
        event_data = {
            'event_id': event_id,
            'group_id': group_id,
            'title': request.title,
            'description': request.description,
            'event_date': request.event_date,
            'event_time': request.event_time,
            'location': request.location,
            'event_type': request.event_type,
            'created_by': user_id,
            'created_at': datetime.utcnow().isoformat()
        }
        
        db.create_event(event_data)
        
        # Return created event
        event = db.get_event_by_id(event_id)
        return EventResponse(**event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    request: UpdateEventRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update event (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Get event
        event = db.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Verify event belongs to user's group
        if event['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate event type if provided
        if request.event_type:
            valid_types = ['PRACTICE', 'GAME', 'MEETING', 'OTHER']
            if request.event_type not in valid_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid event type. Must be one of: {', '.join(valid_types)}"
                )
        
        # Update event
        update_data = {}
        if request.title is not None:
            update_data['title'] = request.title
        if request.description is not None:
            update_data['description'] = request.description
        if request.event_date is not None:
            update_data['event_date'] = request.event_date
        if request.event_time is not None:
            update_data['event_time'] = request.event_time
        if request.location is not None:
            update_data['location'] = request.location
        if request.event_type is not None:
            update_data['event_type'] = request.event_type
        
        if update_data:
            db.update_event(event_id, update_data)
        
        # Return updated event
        event = db.get_event_by_id(event_id)
        return EventResponse(**event)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{event_id}")
async def delete_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete event (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Get event
        event = db.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Verify event belongs to user's group
        if event['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete event
        db.delete_event(event_id)
        
        return {"ok": True, "message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))