from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "ClubApp API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # AWS
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # DynamoDB
    DYNAMODB_TABLE_NAME: str = "ClubAppTable"
    DYNAMODB_ENDPOINT: Optional[str] = None  # For local testing
    
    # Cognito
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str
    COGNITO_REGION: str = "us-east-1"
    
    # S3
    S3_BUCKET_NAME: str = "clubapp-photos"
    
    # SES (Email)
    SES_FROM_EMAIL: str = "noreply@clubapp.com"
    SES_REGION: str = "us-east-1"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-this"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://yourdomain.com"
    ]
    
    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()