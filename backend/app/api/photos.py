from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.services.db_service import get_db_service
from app.services.s3_service import upload_photo, delete_photo, get_photo_url
from app.api.auth import get_current_user_id

router = APIRouter()

# Request/Response Models
class PhotoResponse(BaseModel):
    photo_id: str
    group_id: int
    url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    uploaded_by: str
    uploader_name: str
    uploaded_at: str

class UpdatePhotoRequest(BaseModel):
    caption: Optional[str] = None


@router.get("/", response_model=List[PhotoResponse])
async def get_photos(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get photos for user's group
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get photos
        photos = db.get_group_photos(group_id, limit=limit, offset=offset)
        
        # Add uploader names
        photo_list = []
        for photo in photos:
            uploader = db.get_user_by_id(photo['uploaded_by'])
            photo_list.append(PhotoResponse(
                **photo,
                uploader_name=uploader.get('display_name', uploader['email']) if uploader else 'Unknown'
            ))
        
        return photo_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get specific photo details
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Get photo
        photo = db.get_photo_by_id(photo_id)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Verify photo belongs to user's group
        if photo['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Add uploader name
        uploader = db.get_user_by_id(photo['uploaded_by'])
        
        return PhotoResponse(
            **photo,
            uploader_name=uploader.get('display_name', uploader['email']) if uploader else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=PhotoResponse)
async def upload_photo_endpoint(
    file: UploadFile = File(...),
    caption: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Upload a new photo
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate photo ID
        photo_id = str(uuid.uuid4())
        
        # Upload to S3 (or local storage in development)
        try:
            photo_url = upload_photo(file, group_id, photo_id)
            # TODO: Generate thumbnail
            thumbnail_url = None
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")
        
        # Save to database
        photo_data = {
            'photo_id': photo_id,
            'group_id': group_id,
            'url': photo_url,
            'thumbnail_url': thumbnail_url,
            'caption': caption,
            'uploaded_by': user_id,
            'uploaded_at': datetime.utcnow().isoformat()
        }
        
        db.create_photo(photo_data)
        
        # Return created photo
        photo = db.get_photo_by_id(photo_id)
        uploader = db.get_user_by_id(user_id)
        
        return PhotoResponse(
            **photo,
            uploader_name=uploader.get('display_name', uploader['email']) if uploader else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    photo_id: str,
    request: UpdatePhotoRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update photo caption (uploader or admin only)
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # Get photo
        photo = db.get_photo_by_id(photo_id)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Verify photo belongs to user's group
        if photo['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check permissions (admin or uploader)
        if not is_admin and photo['uploaded_by'] != user_id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Update photo
        if request.caption is not None:
            db.update_photo(photo_id, {'caption': request.caption})
        
        # Return updated photo
        photo = db.get_photo_by_id(photo_id)
        uploader = db.get_user_by_id(photo['uploaded_by'])
        
        return PhotoResponse(
            **photo,
            uploader_name=uploader.get('display_name', uploader['email']) if uploader else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{photo_id}")
async def delete_photo_endpoint(photo_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete photo (uploader or admin only)
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # Get photo
        photo = db.get_photo_by_id(photo_id)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Verify photo belongs to user's group
        if photo['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check permissions (admin or uploader)
        if not is_admin and photo['uploaded_by'] != user_id:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Delete from S3
        try:
            delete_photo(photo['url'])
            if photo.get('thumbnail_url'):
                delete_photo(photo['thumbnail_url'])
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Failed to delete photo from storage: {str(e)}")
        
        # Delete from database
        db.delete_photo(photo_id)
        
        return {"ok": True, "message": "Photo deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/count")
async def get_photo_count(user_id: str = Depends(get_current_user_id)):
    """
    Get total photo count for user's group
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        count = db.get_group_photo_count(group_id)
        
        return {"count": count}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))