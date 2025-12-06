from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid
import jwt  # PyJWT or python-jose compatible import

from app.config import settings
from app.services.db_service import get_db_service
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter()

# ============= REQUEST / RESPONSE MODELS =============

class LoginRequest(BaseModel):
    # Match frontend: login with email + password
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    # Match frontend SignupPage: email, password, name, groupName/inviteCode
    email: EmailStr
    password: str
    name: str
    groupName: Optional[str] = None
    inviteCode: Optional[str] = None


class LoginResponse(BaseModel):
    ok: bool = True
    userId: str
    displayName: Optional[str] = None
    groupId: Optional[int] = None
    role: str  # "admin" or "member"
    token: str


class SignupResponse(BaseModel):
    ok: bool = True
    userId: str
    groupId: int
    role: str
    groupCode: Optional[str] = None
    token: str


# ============= AUTH ENDPOINTS =============

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login with email + password. Requires that the user already belongs to a group.
    """
    try:
        db = get_db_service()

        # Find user by email
        user = db.get_user_by_email(request.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        if not verify_password(request.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get user's group membership (assume one active group for now)
        membership = db.get_user_membership(user["user_id"])
        if not membership:
            raise HTTPException(
                status_code=404,
                detail="User is not associated with any team yet",
            )

        # Create JWT token
        token_data = {
            "user_id": user["user_id"],
            "email": user["email"],
            "group_id": membership["group_id"],
            "role": membership["role"],
        }
        token = create_access_token(token_data)

        return LoginResponse(
            userId=user["user_id"],
            displayName=user.get("display_name"),
            groupId=membership["group_id"],
            role=membership["role"],
            token=token,
        )

    except HTTPException:
        raise
    except Exception as e:
        # Surface a generic error to the client, but log details server-side
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/signup", response_model=SignupResponse)
async def signup(request: SignupRequest):
    """
    Signup endpoint - creates new user and either:
    1. Creates new group (if groupName provided) - user becomes admin
    2. Joins existing group (if inviteCode provided) - user becomes member
    """
    try:
        db = get_db_service()

        # Check if user already exists
        existing_user = db.get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")

        # Validate that either groupName or inviteCode is provided (but not both)
        if not request.groupName and not request.inviteCode:
            raise HTTPException(
                status_code=400,
                detail="Either groupName or inviteCode must be provided",
            )

        if request.groupName and request.inviteCode:
            raise HTTPException(
                status_code=400,
                detail="Provide either groupName or inviteCode, not both",
            )

        # Create user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(request.password)
        now = datetime.utcnow().isoformat()

        user_data = {
            "user_id": user_id,
            "email": request.email,
            "display_name": request.name,
            "password_hash": password_hash,
            "created_at": now,
        }

        print(f"Creating user: {user_id}, email: {request.email}")
        db.create_user(user_data)
        print(f"✓ User created successfully")

        # Handle group creation or joining
        group_code: Optional[str] = None

        if request.groupName:
            # Create new group - user becomes admin
            print(f"Creating group: {request.groupName}")
            group_id = db.create_group(
                {
                    "name": request.groupName,
                    "created_by": user_id,
                    "created_at": now,
                }
            )
            print(f"✓ Group created: group_id={group_id}")

            # Generate invite code for the group
            print(f"Generating invite code for group {group_id}")
            group_code = db.generate_group_invite_code(group_id)
            print(f"✓ Invite code generated: {group_code}")

            # Add user as admin
            print(f"Adding user {user_id} to group {group_id} as admin")
            db.add_group_member(
                {
                    "group_id": group_id,
                    "user_id": user_id,
                    "role": "admin",
                    "joined_at": now,
                    # status/balance defaulted in LocalDBService
                }
            )
            print(f"✓ User added to group successfully")

            role = "admin"

        else:
            # Join existing group - user becomes member via invite code
            group = db.get_group_by_invite_code(request.inviteCode)
            if not group:
                raise HTTPException(status_code=404, detail="Invalid invite code")

            group_id = group["group_id"]

            db.add_group_member(
                {
                    "group_id": group_id,
                    "user_id": user_id,
                    "role": "member",
                    "joined_at": now,
                }
            )

            role = "member"

        # Create JWT token
        token_data = {
            "user_id": user_id,
            "email": request.email,
            "group_id": group_id,
            "role": role,
        }
        token = create_access_token(token_data)

        return SignupResponse(
            userId=user_id,
            groupId=group_id,
            role=role,
            groupCode=group_code,
            token=token,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        # Log the full error for debugging in CloudWatch
        traceback.print_exc()
        print(f"SIGNUP ERROR: {type(e).__name__}: {str(e)}")

        # Return a proper HTTP error with details
        raise HTTPException(
            status_code=500,
            detail=f"Signup failed: {type(e).__name__}: {str(e)}"
        )


# ============= CURRENT USER / JWT HELPERS =============

async def get_current_user_id(authorization: str = Header(None)):
    """
    Extract user_id from JWT token in Authorization header.
    Expecting: Authorization: Bearer <token>
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        token = authorization.replace("Bearer ", "").strip()
        if not token:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Works for both PyJWT and python-jose style jwt.decode
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id

    except HTTPException:
        raise
    except Exception:
        # Any decode/verification error → treat as invalid token
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """
    Get current authenticated user information.
    """
    try:
        db = get_db_service()
        user = db.get_user_by_id(user_id)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        membership = db.get_user_membership(user_id)

        return {
            "user_id": user["user_id"],
            "email": user["email"],
            "display_name": user.get("display_name"),
            "group_id": membership["group_id"] if membership else None,
            "role": membership["role"] if membership else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
