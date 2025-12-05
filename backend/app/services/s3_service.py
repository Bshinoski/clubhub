import boto3
from typing import Dict, Any
from app.config import settings
import shortuuid

class S3Service:
    def __init__(self):
        self.client = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.bucket = settings.S3_BUCKET_NAME
    
    def generate_presigned_upload_url(self, group_id: str, file_extension: str) -> Dict[str, Any]:
        """Generate presigned URL for photo upload"""
        photo_id = shortuuid.uuid()
        key = f"groups/{group_id}/photos/{photo_id}.{file_extension}"
        
        try:
            url = self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': f'image/{file_extension}'
                },
                ExpiresIn=3600  # 1 hour
            )
            
            return {
                "success": True,
                "uploadUrl": url,
                "key": key,
                "photoId": photo_id
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def generate_presigned_get_url(self, key: str) -> str:
        """Generate presigned URL for photo download"""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=3600
            )
            return url
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def delete_photo(self, key: str) -> bool:
        """Delete photo from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            print(f"Error deleting photo: {e}")
            return False