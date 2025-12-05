from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "ClubApp API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # AWS
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # Database
    DATABASE_URL: str = "sqlite:///./clubhub.db"  # Use /tmp/clubhub.db for Lambda
    USE_DYNAMODB: bool = False  # Set to True to use DynamoDB instead of SQLite

    # DynamoDB Table Names
    DYNAMODB_USERS_TABLE: str = "ClubHub-Users"
    DYNAMODB_GROUPS_TABLE: str = "ClubHub-Groups"
    DYNAMODB_GROUP_MEMBERS_TABLE: str = "ClubHub-GroupMembers"
    DYNAMODB_EVENTS_TABLE: str = "ClubHub-Events"
    DYNAMODB_PAYMENTS_TABLE: str = "ClubHub-Payments"
    DYNAMODB_MESSAGES_TABLE: str = "ClubHub-Messages"
    DYNAMODB_PHOTOS_TABLE: str = "ClubHub-Photos"

    # Legacy DynamoDB settings (kept for compatibility)
    DYNAMODB_TABLE_NAME: str = "ClubAppTable"
    DYNAMODB_ENDPOINT: Optional[str] = None  # For local DynamoDB

    # Cognito (Optional - not used in current JWT implementation)
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_CLIENT_ID: Optional[str] = None
    COGNITO_REGION: str = "us-east-1"
    
    # S3
    S3_BUCKET_NAME: str = "clubapp-photos"

    # Local Storage (used when AWS is not configured)
    USE_LOCAL_STORAGE: bool = True  # Set to False to use S3
    LOCAL_STORAGE_PATH: str = "./uploads"
    LOCAL_STORAGE_URL_PREFIX: str = "http://localhost:8000/uploads"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()