import boto3
from jose import jwt
from datetime import datetime, timedelta
from typing import Dict, Any
from app.config import settings
import shortuuid

class CognitoService:
    def __init__(self):
        self.client = boto3.client(
            'cognito-idp',
            region_name=settings.COGNITO_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_CLIENT_ID
    
    def sign_up(self, email: str, password: str, name: str) -> Dict[str, Any]:
        """Create new Cognito user"""
        try:
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "name", "Value": name}
                ]
            )
            return {
                "success": True,
                "cognitoId": response["UserSub"],
                "message": "User created successfully"
            }
        except self.client.exceptions.UsernameExistsException:
            return {"success": False, "error": "User already exists"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def confirm_sign_up(self, email: str, code: str) -> bool:
        """Confirm user email with verification code"""
        try:
            self.client.confirm_sign_up(
                ClientId=self.client_id,
                Username=email,
                ConfirmationCode=code
            )
            return True
        except Exception as e:
            print(f"Confirmation error: {e}")
            return False
    
    def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user"""
        try:
            response = self.client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            return {
                "success": True,
                "access_token": response['AuthenticationResult']['AccessToken'],
                "id_token": response['AuthenticationResult']['IdToken'],
                "refresh_token": response['AuthenticationResult']['RefreshToken']
            }
        except self.client.exceptions.NotAuthorizedException:
            return {"success": False, "error": "Invalid credentials"}
        except self.client.exceptions.UserNotFoundException:
            return {"success": False, "error": "User not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_user(self, access_token: str) -> Dict[str, Any]:
        """Get user details from access token"""
        try:
            response = self.client.get_user(AccessToken=access_token)
            attributes = {attr['Name']: attr['Value'] for attr in response['UserAttributes']}
            return {
                "success": True,
                "username": response['Username'],
                "attributes": attributes
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


def create_jwt_token(user_id: str, email: str, name: str) -> str:
    """Create JWT token for API authentication"""
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": expire
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token