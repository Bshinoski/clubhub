from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# Request/Response Models
class MemberResponse(BaseModel):
    user_id: str
    email: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    role: str
    joined_at: str
    status: str = "active"

class UpdateMemberRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None

class UpdateMemberRoleRequest(BaseModel):
    role: str  # "admin" or "member"


@router.get("/", response_model=List[MemberResponse])
async def get_group_members(user_id: str = Depends(get_current_user_id)):
    """
    Get all members in the user's group
    """
    try:
        db = get_db_service()
        
        # Get user's group
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get all members
        members = db.get_group_members(group_id)
        
        member_list = []
        for member in members:
            user = db.get_user_by_id(member['user_id'])
            if user:
                member_list.append(MemberResponse(
                    user_id=user['user_id'],
                    email=user['email'],
                    display_name=user.get('display_name'),
                    phone=user.get('phone'),
                    role=member['role'],
                    joined_at=member['joined_at'],
                    status=member.get('status', 'active')
                ))
        
        return member_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(member_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get specific member details
    """
    try:
        db = get_db_service()
        
        # Verify user is in a group
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get member
        member = db.get_user_by_id(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Get membership info
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership['group_id'] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")
        
        return MemberResponse(
            user_id=member['user_id'],
            email=member['email'],
            display_name=member.get('display_name'),
            phone=member.get('phone'),
            role=member_membership['role'],
            joined_at=member_membership['joined_at'],
            status=member_membership.get('status', 'active')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    request: UpdateMemberRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update member information (user can update self, admin can update anyone)
    """
    try:
        db = get_db_service()
        
        # Get user's membership
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Check permissions
        is_admin = membership['role'] == 'admin'
        is_self = user_id == member_id
        
        if not is_admin and not is_self:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Verify member is in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership['group_id'] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")
        
        # Update user data
        update_data = {}
        if request.display_name is not None:
            update_data['display_name'] = request.display_name
        if request.phone is not None:
            update_data['phone'] = request.phone
        
        if update_data:
            db.update_user(member_id, update_data)
        
        # Get updated member
        member = db.get_user_by_id(member_id)
        
        return MemberResponse(
            user_id=member['user_id'],
            email=member['email'],
            display_name=member.get('display_name'),
            phone=member.get('phone'),
            role=member_membership['role'],
            joined_at=member_membership['joined_at'],
            status=member_membership.get('status', 'active')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: str,
    request: UpdateMemberRoleRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update member role (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Validate role
        if request.role not in ['admin', 'member']:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Verify member is in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership['group_id'] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")
        
        # Don't allow user to demote themselves if they're the only admin
        if user_id == member_id and request.role == 'member':
            admin_count = db.get_group_admin_count(group_id)
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote yourself - group must have at least one admin"
                )
        
        # Update role
        db.update_member_role(group_id, member_id, request.role)
        
        # Get updated member
        member = db.get_user_by_id(member_id)
        updated_membership = db.get_user_membership(member_id)
        
        return MemberResponse(
            user_id=member['user_id'],
            email=member['email'],
            display_name=member.get('display_name'),
            phone=member.get('phone'),
            role=updated_membership['role'],
            joined_at=updated_membership['joined_at'],
            status=updated_membership.get('status', 'active')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{member_id}")
async def remove_member(member_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Remove member from group (admin only, or user can remove themselves)
    """
    try:
        db = get_db_service()
        
        # Get user's membership
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        is_self = user_id == member_id
        
        # Check permissions
        if not is_admin and not is_self:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Verify member is in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership['group_id'] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")
        
        # Don't allow removing the last admin
        if member_membership['role'] == 'admin':
            admin_count = db.get_group_admin_count(group_id)
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot remove the last admin from the group"
                )
        
        # Remove member
        db.remove_group_member(group_id, member_id)
        
        return {"ok": True, "message": "Member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))