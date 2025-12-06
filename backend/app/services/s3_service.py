import os
from pathlib import Path
from typing import Dict, Any, Optional
from urllib.parse import urlparse
import shutil

from app.config import settings


class LocalStorageService:
    """Local file storage service for development/testing without AWS"""

    def __init__(self):
        self.storage_path = Path(settings.LOCAL_STORAGE_PATH)
        self.url_prefix = settings.LOCAL_STORAGE_URL_PREFIX
        # Create storage directory if it doesn't exist
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def upload_photo(self, file, group_id: str, photo_id: str) -> str:
        """
        Upload a photo file to local storage and return the URL.

        `file` is a FastAPI UploadFile.
        """
        filename = file.filename or "photo"
        if "." in filename:
            ext = filename.rsplit(".", 1)[-1]
        else:
            ext = "jpg"

        # Create directory structure: uploads/groups/{group_id}/photos/
        group_dir = self.storage_path / "groups" / str(group_id) / "photos"
        group_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = group_dir / f"{photo_id}.{ext}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return URL path
        relative_path = f"groups/{group_id}/photos/{photo_id}.{ext}"
        return f"{self.url_prefix}/{relative_path}"

    def delete_photo(self, url_or_path: str) -> bool:
        """Delete photo from local storage"""
        try:
            # Extract relative path from URL
            if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
                parsed = urlparse(url_or_path)
                relative_path = parsed.path.lstrip("/uploads/")
            else:
                relative_path = url_or_path

            file_path = self.storage_path / relative_path
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting photo: {e}")
            return False

    def get_photo_url(self, url_or_path: str) -> str:
        """
        Return a usable URL for a photo.
        If it's already a URL, just return it.
        """
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            return url_or_path
        return f"{self.url_prefix}/{url_or_path}"


class S3Service:
    """AWS S3 storage service for production"""

    def __init__(self):
        import boto3
        self.client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.bucket = settings.S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    def _key_from_url(self, url_or_key: str) -> str:
        """
        Accept either a full S3 URL or a raw key and return the S3 key.
        """
        if url_or_key.startswith("http://") or url_or_key.startswith("https://"):
            parsed = urlparse(url_or_key)
            return parsed.path.lstrip("/")
        return url_or_key

    def _object_url(self, key: str) -> str:
        """
        Build a public-style URL for an object key.
        """
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

    def upload_photo(self, file, group_id: str, photo_id: str) -> str:
        """
        Upload a photo file object to S3 and return the object URL.

        `file` is a FastAPI UploadFile.
        """
        filename = file.filename or "photo"
        if "." in filename:
            ext = filename.rsplit(".", 1)[-1]
        else:
            ext = "jpg"

        key = f"groups/{group_id}/photos/{photo_id}.{ext}"

        # Upload the file contents
        self.client.upload_fileobj(
            file.file,
            self.bucket,
            key,
            ExtraArgs={"ContentType": file.content_type or f"image/{ext}"},
        )

        return self._object_url(key)

    def delete_photo(self, url_or_key: str) -> bool:
        """Delete photo from S3, accepting either a full URL or a key."""
        try:
            key = self._key_from_url(url_or_key)
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            print(f"Error deleting photo: {e}")
            return False

    def get_photo_url(self, url_or_key: str) -> str:
        """
        Return a usable URL for a photo.
        If it's already a URL, just return it; if it's a key, build the URL.
        """
        if url_or_key.startswith("http://") or url_or_key.startswith("https://"):
            return url_or_key
        return self._object_url(url_or_key)

    def generate_presigned_upload_url(
        self, group_id: str, file_extension: str
    ) -> Dict[str, Any]:
        """Generate presigned URL for photo upload."""
        photo_id = f"{group_id}-temp"
        key = f"groups/{group_id}/photos/{photo_id}.{file_extension}"

        try:
            url = self.client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": f"image/{file_extension}",
                },
                ExpiresIn=3600,  # 1 hour
            )

            return {
                "success": True,
                "uploadUrl": url,
                "key": key,
                "photoId": photo_id,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_presigned_get_url(self, key_or_url: str) -> Optional[str]:
        """Generate presigned URL for photo download, given key or URL."""
        try:
            key = self._key_from_url(key_or_url)
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=3600,
            )
            return url
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None


# ============= STORAGE SERVICE FACTORY =============

def _get_storage_service():
    """Get the appropriate storage service based on configuration"""
    if settings.USE_LOCAL_STORAGE:
        return LocalStorageService()
    else:
        return S3Service()


_storage_service = _get_storage_service()


# ============= FUNCTION WRAPPERS FOR ROUTERS =============

def upload_photo(file, group_id: str, photo_id: str) -> str:
    """Wrapper used by photos API to upload and return URL."""
    return _storage_service.upload_photo(file, group_id, photo_id)


def get_photo_url(key_or_url: str) -> str:
    """Wrapper used by photos API to get a URL for a photo."""
    return _storage_service.get_photo_url(key_or_url)


def delete_photo(key_or_url: str) -> bool:
    """Wrapper used by photos API to delete a photo."""
    return _storage_service.delete_photo(key_or_url)
