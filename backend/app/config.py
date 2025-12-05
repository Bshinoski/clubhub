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
    
    # DynamoDB
    DYNAMODB_TABLE_NAME: str = "ClubAppTable"
    DYNAMODB_ENDPOINT: Optional[str] = None  # For local DynamoDB
    
    # Cognito
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str
    COGNITO_REGION: str = "us-east-1"
    
    # S3
    S3_BUCKET_NAME: str = "clubapp-photos"
    
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