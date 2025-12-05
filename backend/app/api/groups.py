from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# Request/Response Models
class GroupResponse(BaseModel):
    group_id: int
    name: str
    description: Optional[str] = None
    invite_code: str
    created_at: str
    member_count: int

class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GenerateInviteCodeResponse(BaseModel):
    invite_code: str


@router.get("/", response_model=GroupResponse)
async def get_my_group(user_id: str = Depends(get_current_user_id)):
    """
    Get current user's group information
    """
    try:
        db = get_db_service()
        
        # Get user's membership
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        # Get group details
        group = db.get_group_by_id(membership['group_id'])
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Get member count
        member_count = db.get_group_member_count(group['group_id'])
        
        # Get or generate invite code
        invite_code = db.get_group_invite_code(group['group_id'])
        if not invite_code:
            invite_code = db.generate_group_invite_code(group['group_id'])
        
        return GroupResponse(
            group_id=group['group_id'],
            name=group['name'],
            description=group.get('description'),
            invite_code=invite_code,
            created_at=group['created_at'],
            member_count=member_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/", response_model=GroupResponse)
async def update_group(
    request: UpdateGroupRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update group information (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Update group
        update_data = {}
        if request.name:
            update_data['name'] = request.name
        if request.description is not None:
            update_data['description'] = request.description
        
        if update_data:
            db.update_group(group_id, update_data)
        
        # Get updated group
        group = db.get_group_by_id(group_id)
        member_count = db.get_group_member_count(group_id)
        invite_code = db.get_group_invite_code(group_id)
        
        return GroupResponse(
            group_id=group['group_id'],
            name=group['name'],
            description=group.get('description'),
            invite_code=invite_code,
            created_at=group['created_at'],
            member_count=member_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invite-code", response_model=GenerateInviteCodeResponse)
async def regenerate_invite_code(user_id: str = Depends(get_current_user_id)):
    """
    Generate new invite code for group (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Generate new invite code
        invite_code = db.generate_group_invite_code(group_id, regenerate=True)
        
        return GenerateInviteCodeResponse(invite_code=invite_code)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_group_settings(user_id: str = Depends(get_current_user_id)):
    """
    Get group settings (admin only)
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        settings = db.get_group_settings(group_id)
        
        return settings or {}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_group_settings(
    settings: dict,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update group settings (admin only)
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        db.update_group_settings(group_id, settings)
        
        return {"ok": True, "message": "Settings updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))