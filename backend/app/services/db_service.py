import boto3
from boto3.dynamodb.conditions import Key, Attr
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.config import settings
import shortuuid

class DynamoDBService:
    def __init__(self):
        dynamodb_config = {
            "region_name": settings.AWS_REGION
        }
        
        if settings.DYNAMODB_ENDPOINT:
            dynamodb_config["endpoint_url"] = settings.DYNAMODB_ENDPOINT
            
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            dynamodb_config["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            dynamodb_config["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        
        self.dynamodb = boto3.resource('dynamodb', **dynamodb_config)
        self.table = self.dynamodb.Table(settings.DYNAMODB_TABLE_NAME)
    
    # ============= USER OPERATIONS =============
    
    def create_user(self, user_id: str, cognito_id: str, email: str, name: str, phone: Optional[str] = None) -> Dict[str, Any]:
        """Create a new user"""
        item = {
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
            "GSI1PK": f"EMAIL#{email}",
            "GSI1SK": f"USER#{user_id}",
            "id": user_id,
            "cognitoId": cognito_id,
            "email": email,
            "name": name,
            "phone": phone,
            "createdAt": datetime.utcnow().isoformat()
        }
        self.table.put_item(Item=item)
        return item
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        response = self.table.get_item(
            Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}
        )
        return response.get("Item")
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email using GSI1"""
        response = self.table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"EMAIL#{email}")
        )
        items = response.get("Items", [])
        return items[0] if items else None
    
    # ============= GROUP OPERATIONS =============
    
    def create_group(self, user_id: str, name: str, sport: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Create a new group"""
        group_id = shortuuid.uuid()
        invite_code = shortuuid.ShortUUID().random(length=6).upper()
        
        item = {
            "PK": f"GROUP#{group_id}",
            "SK": "METADATA",
            "GSI1PK": f"CREATOR#{user_id}",
            "GSI1SK": f"GROUP#{group_id}",
            "id": group_id,
            "name": name,
            "sport": sport,
            "description": description,
            "inviteCode": invite_code,
            "createdBy": user_id,
            "createdAt": datetime.utcnow().isoformat()
        }
        self.table.put_item(Item=item)
        
        # Add creator as admin
        self.add_membership(user_id, group_id, "ADMIN")
        
        return item
    
    def get_group(self, group_id: str) -> Optional[Dict[str, Any]]:
        """Get group by ID"""
        response = self.table.get_item(
            Key={"PK": f"GROUP#{group_id}", "SK": "METADATA"}
        )
        return response.get("Item")
    
    def get_group_by_invite_code(self, invite_code: str) -> Optional[Dict[str, Any]]:
        """Find group by invite code (requires scan)"""
        response = self.table.scan(
            FilterExpression=Attr("inviteCode").eq(invite_code) & Attr("SK").eq("METADATA")
        )
        items = response.get("Items", [])
        return items[0] if items else None
    
    def update_group(self, group_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update group details"""
        update_expr = "SET " + ", ".join([f"#{k} = :{k}" for k in updates.keys()])
        expr_attr_names = {f"#{k}": k for k in updates.keys()}
        expr_attr_values = {f":{k}": v for k, v in updates.items()}
        
        response = self.table.update_item(
            Key={"PK": f"GROUP#{group_id}", "SK": "METADATA"},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )
        return response.get("Attributes")
    
    # ============= MEMBERSHIP OPERATIONS =============
    
    def add_membership(self, user_id: str, group_id: str, role: str = "MEMBER") -> Dict[str, Any]:
        """Add user to group"""
        user = self.get_user(user_id)
        
        item = {
            "PK": f"USER#{user_id}",
            "SK": f"GROUP#{group_id}",
            "GSI1PK": f"GROUP#{group_id}",
            "GSI1SK": f"USER#{user_id}#{role}",
            "userId": user_id,
            "userName": user.get("name", "Unknown"),
            "groupId": group_id,
            "role": role,
            "joinedAt": datetime.utcnow().isoformat(),
            "status": "ACTIVE",
            "balance": 0.0
        }
        self.table.put_item(Item=item)
        return item
    
    def get_membership(self, user_id: str, group_id: str) -> Optional[Dict[str, Any]]:
        """Get user's membership in a group"""
        response = self.table.get_item(
            Key={"PK": f"USER#{user_id}", "SK": f"GROUP#{group_id}"}
        )
        return response.get("Item")
    
    def get_user_groups(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all groups for a user"""
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("GROUP#")
        )
        memberships = response.get("Items", [])
        
        # Fetch group details
        groups = []
        for membership in memberships:
            group_id = membership["groupId"]
            group = self.get_group(group_id)
            if group:
                group["role"] = membership["role"]
                group["balance"] = membership.get("balance", 0.0)
                groups.append(group)
        
        return groups
    
    def get_group_members(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all members of a group"""
        response = self.table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"GROUP#{group_id}") & Key("GSI1SK").begins_with("USER#")
        )
        return response.get("Items", [])
    
    def update_member_role(self, user_id: str, group_id: str, new_role: str) -> Dict[str, Any]:
        """Update member's role in group"""
        response = self.table.update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"GROUP#{group_id}"},
            UpdateExpression="SET #role = :role, GSI1SK = :gsi1sk",
            ExpressionAttributeNames={"#role": "role"},
            ExpressionAttributeValues={
                ":role": new_role,
                ":gsi1sk": f"USER#{user_id}#{new_role}"
            },
            ReturnValues="ALL_NEW"
        )
        return response.get("Attributes")
    
    def update_member_balance(self, user_id: str, group_id: str, amount: float) -> Dict[str, Any]:
        """Update member's balance"""
        response = self.table.update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"GROUP#{group_id}"},
            UpdateExpression="SET balance = balance + :amount",
            ExpressionAttributeValues={":amount": amount},
            ReturnValues="ALL_NEW"
        )
        return response.get("Attributes")
    
    def remove_member(self, user_id: str, group_id: str):
        """Remove member from group"""
        self.table.delete_item(
            Key={"PK": f"USER#{user_id}", "SK": f"GROUP#{group_id}"}
        )
    
    # ============= EVENT OPERATIONS =============
    
    def create_event(self, group_id: str, user_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event"""
        event_id = shortuuid.uuid()
        timestamp = f"{event_data['date']}T{event_data['time'].replace(':', '-')}"
        
        item = {
            "PK": f"GROUP#{group_id}",
            "SK": f"EVENT#{timestamp}#{event_id}",
            "id": event_id,
            "groupId": group_id,
            "createdBy": user_id,
            "createdAt": datetime.utcnow().isoformat(),
            **event_data
        }
        self.table.put_item(Item=item)
        return item
    
    def get_event(self, group_id: str, event_sk: str) -> Optional[Dict[str, Any]]:
        """Get specific event"""
        response = self.table.get_item(
            Key={"PK": f"GROUP#{group_id}", "SK": event_sk}
        )
        return response.get("Item")
    
    def get_group_events(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all events for a group"""
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"GROUP#{group_id}") & Key("SK").begins_with("EVENT#")
        )
        return response.get("Items", [])
    
    def update_event(self, group_id: str, event_sk: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update event"""
        update_expr = "SET " + ", ".join([f"#{k} = :{k}" for k in updates.keys()])
        expr_attr_names = {f"#{k}": k for k in updates.keys()}
        expr_attr_values = {f":{k}": v for k, v in updates.items()}
        
        response = self.table.update_item(
            Key={"PK": f"GROUP#{group_id}", "SK": event_sk},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues="ALL_NEW"
        )
        return response.get("Attributes")
    
    def delete_event(self, group_id: str, event_sk: str):
        """Delete event"""
        self.table.delete_item(
            Key={"PK": f"GROUP#{group_id}", "SK": event_sk}
        )
    
    # ============= PAYMENT OPERATIONS =============
    
    def create_payment(self, group_id: str, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a payment record"""
        payment_id = shortuuid.uuid()
        
        item = {
            "PK": f"GROUP#{group_id}",
            "SK": f"PAYMENT#{payment_id}",
            "GSI1PK": f"USER#{payment_data['memberId']}",
            "GSI1SK": f"PAYMENT#{payment_id}",
            "id": payment_id,
            "groupId": group_id,
            "createdAt": datetime.utcnow().isoformat(),
            **payment_data
        }
        self.table.put_item(Item=item)
        
        # Update member balance
        amount = payment_data["amount"]
        if payment_data["type"] == "CHARGE":
            self.update_member_balance(payment_data["memberId"], group_id, -amount)
        else:  # CREDIT
            self.update_member_balance(payment_data["memberId"], group_id, amount)
        
        return item
    
    def get_group_payments(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all payments for a group"""
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"GROUP#{group_id}") & Key("SK").begins_with("PAYMENT#")
        )
        return response.get("Items", [])
    
    def get_user_payments(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all payments for a user"""
        response = self.table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"USER#{user_id}") & Key("GSI1SK").begins_with("PAYMENT#")
        )
        return response.get("Items", [])
    
    def update_payment(self, group_id: str, payment_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update payment status"""
        response = self.table.update_item(
            Key={"PK": f"GROUP#{group_id}", "SK": f"PAYMENT#{payment_id}"},
            UpdateExpression="SET #status = :status, paidDate = :paidDate",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": updates.get("status"),
                ":paidDate": updates.get("paidDate")
            },
            ReturnValues="ALL_NEW"
        )
        
        # If payment marked as PAID, update balance
        payment = response.get("Attributes")
        if updates.get("status") == "PAID":
            amount = payment["amount"]
            if payment["type"] == "CHARGE":
                self.update_member_balance(payment["memberId"], group_id, amount)
        
        return payment
    
    # ============= MESSAGE OPERATIONS =============
    
    def create_message(self, group_id: str, user_id: str, user_name: str, content: str) -> Dict[str, Any]:
        """Create a chat message"""
        message_id = shortuuid.uuid()
        timestamp = datetime.utcnow().isoformat()
        
        item = {
            "PK": f"GROUP#{group_id}",
            "SK": f"MSG#{timestamp}#{message_id}",
            "id": message_id,
            "groupId": group_id,
            "userId": user_id,
            "userName": user_name,
            "content": content,
            "createdAt": timestamp
        }
        self.table.put_item(Item=item)
        return item
    
    def get_group_messages(self, group_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent messages for a group"""
        response = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"GROUP#{group_id}") & Key("SK").begins_with("MSG#"),
            Limit=limit,
            ScanIndexForward=False  # Most recent first
        )
        items = response.get("Items", [])
        return list(reversed(items))  # Oldest first


_db_service: Optional["DynamoDBService"] = None

def get_db_service() -> "DynamoDBService":
    global _db_service
    if _db_service is None:
        _db_service = DynamoDBService()
    return _db_service