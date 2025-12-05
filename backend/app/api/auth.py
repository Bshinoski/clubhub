from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt
import jwt
from datetime import datetime, timedelta
import uuid

from app.config import settings
from app.services.db_service import get_db_service
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter()

# Request/Response Models
class LoginRequest(BaseModel):
    username: str  # Can be email
    password: str

class SignupRequest(BaseModel):
    username: str  # Email
    password: str
    displayName: Optional[str] = None
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


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint - supports both creating new group and joining existing
    """
    try:
        db = get_db_service()
        
        # Find user by username/email
        user = db.get_user_by_email(request.username)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not verify_password(request.password, user.get('password_hash', '')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get user's group membership
        membership = db.get_user_membership(user['user_id'])
        
        if not membership:
            raise HTTPException(status_code=404, detail="User not associated with any group")
        
        # Create JWT token
        token_data = {
            "user_id": user['user_id'],
            "email": user['email'],
            "group_id": membership['group_id'],
            "role": membership['role']
        }
        token = create_access_token(token_data)
        
        return LoginResponse(
            userId=user['user_id'],
            displayName=user.get('display_name'),
            groupId=membership['group_id'],
            role=membership['role'],
            token=token
        )
        
    except HTTPException:
        raise
    except Exception as e:
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
        existing_user = db.get_user_by_email(request.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Validate that either groupName or inviteCode is provided
        if not request.groupName and not request.inviteCode:
            raise HTTPException(
                status_code=400, 
                detail="Either groupName or inviteCode must be provided"
            )
        
        if request.groupName and request.inviteCode:
            raise HTTPException(
                status_code=400,
                detail="Provide either groupName or inviteCode, not both"
            )
        
        # Create user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(request.password)
        
        user_data = {
            'user_id': user_id,
            'email': request.username,
            'display_name': request.displayName or request.username.split('@')[0],
            'password_hash': password_hash,
            'created_at': datetime.utcnow().isoformat()
        }
        
        db.create_user(user_data)
        
        # Handle group creation or joining
        group_code = None
        
        if request.groupName:
            # Create new group - user becomes admin
            group_id = db.create_group({
                'name': request.groupName,
                'created_by': user_id,
                'created_at': datetime.utcnow().isoformat()
            })
            
            # Generate invite code for the group
            group_code = db.generate_group_invite_code(group_id)
            
            # Add user as admin
            db.add_group_member({
                'group_id': group_id,
                'user_id': user_id,
                'role': 'admin',
                'joined_at': datetime.utcnow().isoformat()
            })
            
            role = 'admin'
            
        else:  # inviteCode provided
            # Join existing group - user becomes member
            group = db.get_group_by_invite_code(request.inviteCode)
            
            if not group:
                raise HTTPException(status_code=404, detail="Invalid invite code")
            
            group_id = group['group_id']
            
            # Add user as member
            db.add_group_member({
                'group_id': group_id,
                'user_id': user_id,
                'role': 'member',
                'joined_at': datetime.utcnow().isoformat()
            })
            
            role = 'member'
        
        # Create JWT token
        token_data = {
            "user_id": user_id,
            "email": request.username,
            "group_id": group_id,
            "role": role
        }
        token = create_access_token(token_data)
        
        return SignupResponse(
            userId=user_id,
            groupId=group_id,
            role=role,
            groupCode=group_code,
            token=token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.get("/me")
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """
    Get current authenticated user information
    """
    try:
        db = get_db_service()
        user = db.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        membership = db.get_user_membership(user_id)
        
        return {
            "user_id": user['user_id'],
            "email": user['email'],
            "display_name": user.get('display_name'),
            "group_id": membership['group_id'] if membership else None,
            "role": membership['role'] if membership else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Dependency to get current user from JWT token
async def get_current_user_id(authorization: str = Depends(lambda: None)):
    """Extract user_id from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Remove 'Bearer ' prefix if present
        token = authorization.replace('Bearer ', '')
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get('user_id')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")