import boto3
from typing import Dict, Any, Optional
from urllib.parse import urlparse

from app.config import settings


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.bucket = settings.S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    # ---------- Internal helpers ----------

    def _key_from_url(self, url_or_key: str) -> str:
        """
        Accept either a full S3 URL or a raw key and return the S3 key.
        """
        if url_or_key.startswith("http://") or url_or_key.startswith("https://"):
            parsed = urlparse(url_or_key)
            # parsed.path starts with '/'
            return parsed.path.lstrip("/")
        return url_or_key

    def _object_url(self, key: str) -> str:
        """
        Build a public-style URL for an object key.
        (Will only actually be accessible if your bucket/object ACL allows it.)
        """
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

    # ---------- Main operations used by photos.py ----------

    def upload_photo(self, file, group_id: str, photo_id: str) -> str:
        """
        Upload a photo file object to S3 and return the object URL.

        `file` is a FastAPI UploadFile in our usage.
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

    # ---------- Optional: presigned URL helpers (not required by photos.py) ----------

    def generate_presigned_upload_url(
        self, group_id: str, file_extension: str
    ) -> Dict[str, Any]:
        """Generate presigned URL for photo upload."""
        # This is kept in case you want presigned uploads later.
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


# ============= FUNCTION WRAPPERS FOR ROUTERS =============

_s3_service = S3Service()

def upload_photo(file, group_id: str, photo_id: str) -> str:
    """Wrapper used by photos API to upload and return URL."""
    return _s3_service.upload_photo(file, group_id, photo_id)


def get_photo_url(key_or_url: str) -> str:
    """Wrapper used by photos API to get a URL for a photo."""
    return _s3_service.get_photo_url(key_or_url)


def delete_photo(key_or_url: str) -> bool:
    """Wrapper used by photos API to delete a photo."""
    return _s3_service.delete_photo(key_or_url)
