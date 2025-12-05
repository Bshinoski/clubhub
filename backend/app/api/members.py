from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# ========= MODELS =========

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


# ========= ROUTES =========

@router.get("/", response_model=List[MemberResponse])
async def get_group_members(user_id: str = Depends(get_current_user_id)):
    """
    Get all members in the current user's group.
    """
    try:
        db = get_db_service()

        # Get the caller's membership (we assume one active group)
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")

        group_id = membership["group_id"]

        # This already returns membership + user info:
        # gm.*, u.email, u.display_name, u.phone
        rows = db.get_group_members(group_id)

        members: List[MemberResponse] = []
        for row in rows:
            members.append(
                MemberResponse(
                    user_id=row["user_id"],
                    email=row["email"],
                    display_name=row.get("display_name"),
                    phone=row.get("phone"),
                    role=row["role"],
                    joined_at=row["joined_at"],
                    status=row.get("status", "ACTIVE").lower(),
                )
            )

        return members

    except HTTPException:
        raise
    except Exception as e:
        # propagate the real DB error message so you can see it in the UI
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(member_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get a specific member in the current user's group.
    """
    try:
        db = get_db_service()

        # Verify caller is in a group
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")

        group_id = membership["group_id"]

        # Look up membership for the requested member, ensure same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership["group_id"] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")

        # Load the user details
        member = db.get_user_by_id(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        return MemberResponse(
            user_id=member["user_id"],
            email=member["email"],
            display_name=member.get("display_name"),
            phone=member.get("phone"),
            role=member_membership["role"],
            joined_at=member_membership["joined_at"],
            status=member_membership.get("status", "ACTIVE").lower(),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    request: UpdateMemberRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update member information (user can update self, admin can update anyone).
    """
    try:
        db = get_db_service()

        # Caller membership
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")

        group_id = membership["group_id"]

        # Permission check
        is_admin = membership["role"] == "admin"
        is_self = user_id == member_id
        if not is_admin and not is_self:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Verify target member is in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership["group_id"] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")

        # Build update payload
        update_data = {}
        if request.display_name is not None:
            update_data["display_name"] = request.display_name
        if request.phone is not None:
            update_data["phone"] = request.phone

        if update_data:
            db.update_user(member_id, update_data)

        member = db.get_user_by_id(member_id)

        return MemberResponse(
            user_id=member["user_id"],
            email=member["email"],
            display_name=member.get("display_name"),
            phone=member.get("phone"),
            role=member_membership["role"],
            joined_at=member_membership["joined_at"],
            status=member_membership.get("status", "ACTIVE").lower(),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: str,
    request: UpdateMemberRoleRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update member role (admin only).
    """
    try:
        db = get_db_service()

        # Caller must be admin
        membership = db.get_user_membership(user_id)
        if not membership or membership["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        group_id = membership["group_id"]

        # Validate role
        if request.role not in ["admin", "member"]:
            raise HTTPException(status_code=400, detail="Invalid role")

        # Verify target member is in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership["group_id"] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")

        # Prevent demoting the last admin (including yourself)
        if user_id == member_id and request.role == "member":
            admin_count = db.get_group_admin_count(group_id)
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote yourself - group must have at least one admin",
                )

        # Update role (note order: group_id, member_id, role)
        db.update_member_role(group_id, member_id, request.role)

        member = db.get_user_by_id(member_id)
        updated_membership = db.get_user_membership(member_id)

        return MemberResponse(
            user_id=member["user_id"],
            email=member["email"],
            display_name=member.get("display_name"),
            phone=member.get("phone"),
            role=updated_membership["role"],
            joined_at=updated_membership["joined_at"],
            status=updated_membership.get("status", "ACTIVE").lower(),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{member_id}")
async def remove_member(member_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Remove member from group (admin only, or user can remove themselves).
    """
    try:
        db = get_db_service()

        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")

        group_id = membership["group_id"]
        is_admin = membership["role"] == "admin"
        is_self = user_id == member_id

        if not is_admin and not is_self:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Verify target member in same group
        member_membership = db.get_user_membership(member_id)
        if not member_membership or member_membership["group_id"] != group_id:
            raise HTTPException(status_code=404, detail="Member not in your group")

        # Don't allow removing the last admin
        if member_membership["role"] == "admin":
            admin_count = db.get_group_admin_count(group_id)
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot remove the last admin from the group",
                )

        # Remove membership
        db.remove_group_member(group_id, member_id)

        return {"ok": True, "message": "Member removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
