import boto3
from typing import List
from app.config import settings

class EmailService:
    def __init__(self):
        self.client = boto3.client(
            'ses',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.from_email = settings.SES_FROM_EMAIL
    
    def send_team_invite(self, to_email: str, team_name: str, invite_code: str, inviter_name: str):
        """Send team invitation email"""
        subject = f"You've been invited to join {team_name} on ClubApp"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #0284c7; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">ClubApp</h1>
                </div>
                
                <div style="padding: 30px; background-color: #f9fafb;">
                    <h2>You're Invited!</h2>
                    <p>{inviter_name} has invited you to join <strong>{team_name}</strong> on ClubApp.</p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;">Your invite code:</p>
                        <h2 style="margin: 0; color: #0284c7; font-size: 32px; letter-spacing: 4px;">{invite_code}</h2>
                    </div>
                    
                    <p>To join the team:</p>
                    <ol>
                        <li>Go to <a href="{settings.FRONTEND_URL}/signup">{settings.FRONTEND_URL}/signup</a></li>
                        <li>Create your account</li>
                        <li>Enter the invite code: <strong>{invite_code}</strong></li>
                    </ol>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px;">
                            If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        text_body = f"""
        You've been invited to join {team_name} on ClubApp!
        
        {inviter_name} has invited you to join their team.
        
        Your invite code: {invite_code}
        
        To join:
        1. Go to {settings.FRONTEND_URL}/signup
        2. Create your account
        3. Enter the invite code: {invite_code}
        
        If you didn't expect this invitation, you can safely ignore this email.
        """
        
        try:
            response = self.client.send_email(
                Source=self.from_email,
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Text': {'Data': text_body},
                        'Html': {'Data': html_body}
                    }
                }
            )
            return {"success": True, "messageId": response['MessageId']}
        except Exception as e:
            print(f"Email send error: {e}")
            return {"success": False, "error": str(e)}