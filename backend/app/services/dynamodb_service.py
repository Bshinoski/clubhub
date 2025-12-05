import os
import boto3
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid
import shortuuid
from boto3.dynamodb.conditions import Key, Attr

from app.config import settings


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(i) for i in obj]
    return obj


def float_to_decimal(obj):
    """Convert float objects to Decimal for DynamoDB"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [float_to_decimal(i) for i in obj]
    return obj


class DynamoDBService:
    """
    DynamoDB-backed service for ClubHub application.
    Implements the same interface as LocalDBService but uses DynamoDB tables.
    """

    def __init__(self) -> None:
        # Initialize DynamoDB client
        self.dynamodb = boto3.resource('dynamodb')

        # Get table names from environment variables
        self.users_table = self.dynamodb.Table(os.environ.get('DYNAMODB_USERS_TABLE', 'ClubHub-Users'))
        self.groups_table = self.dynamodb.Table(os.environ.get('DYNAMODB_GROUPS_TABLE', 'ClubHub-Groups'))
        self.group_members_table = self.dynamodb.Table(os.environ.get('DYNAMODB_GROUP_MEMBERS_TABLE', 'ClubHub-GroupMembers'))
        self.events_table = self.dynamodb.Table(os.environ.get('DYNAMODB_EVENTS_TABLE', 'ClubHub-Events'))
        self.payments_table = self.dynamodb.Table(os.environ.get('DYNAMODB_PAYMENTS_TABLE', 'ClubHub-Payments'))
        self.messages_table = self.dynamodb.Table(os.environ.get('DYNAMODB_MESSAGES_TABLE', 'ClubHub-Messages'))
        self.photos_table = self.dynamodb.Table(os.environ.get('DYNAMODB_PHOTOS_TABLE', 'ClubHub-Photos'))

    # ==================== USER METHODS ====================

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        # Use the user_id from user_data if provided, otherwise generate one
        user_id = user_data.get('user_id', str(uuid.uuid4()))
        created_at = user_data.get('created_at', datetime.utcnow().isoformat())

        item = {
            'user_id': user_id,
            'email': user_data['email'],
            'display_name': user_data.get('display_name', ''),
            'phone': user_data.get('phone', ''),
            'password_hash': user_data['password_hash'],
            'created_at': created_at
        }

        self.users_table.put_item(Item=item)
        return item

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email using GSI"""
        response = self.users_table.query(
            IndexName='EmailIndex',
            KeyConditionExpression=Key('email').eq(email)
        )
        items = response.get('Items', [])
        return decimal_to_float(items[0]) if items else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        response = self.users_table.get_item(Key={'user_id': user_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user information"""
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for key, value in updates.items():
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expr_parts.append(f"{placeholder} = {value_placeholder}")
            expr_attr_names[placeholder] = key
            expr_attr_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(update_expr_parts)

        response = self.users_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    # ==================== GROUP METHODS ====================

    def create_group(self, group_data: Dict[str, Any]) -> int:
        """Create a new group and return its ID"""
        # Generate a unique group_id (using timestamp + random for uniqueness)
        group_id = int(datetime.utcnow().timestamp() * 1000)
        created_at = datetime.utcnow().isoformat()

        item = {
            'group_id': group_id,
            'name': group_data['name'],
            'description': group_data.get('description', ''),
            'invite_code': group_data.get('invite_code', ''),
            'created_by': group_data.get('created_by', ''),
            'created_at': created_at
        }

        self.groups_table.put_item(Item=item)
        return group_id

    def generate_group_invite_code(self, group_id: int) -> str:
        """Generate and update invite code for a group"""
        invite_code = shortuuid.ShortUUID().random(length=6).upper()

        self.groups_table.update_item(
            Key={'group_id': group_id},
            UpdateExpression='SET invite_code = :code',
            ExpressionAttributeValues={':code': invite_code}
        )
        return invite_code

    def get_group_by_invite_code(self, invite_code: str) -> Optional[Dict[str, Any]]:
        """Get group by invite code using GSI"""
        response = self.groups_table.query(
            IndexName='InviteCodeIndex',
            KeyConditionExpression=Key('invite_code').eq(invite_code)
        )
        items = response.get('Items', [])
        return decimal_to_float(items[0]) if items else None

    def get_group_by_id(self, group_id: int) -> Optional[Dict[str, Any]]:
        """Get group by ID"""
        response = self.groups_table.get_item(Key={'group_id': group_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def update_group(self, group_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update group information"""
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for key, value in updates.items():
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expr_parts.append(f"{placeholder} = {value_placeholder}")
            expr_attr_names[placeholder] = key
            expr_attr_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(update_expr_parts)

        response = self.groups_table.update_item(
            Key={'group_id': group_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    # ==================== GROUP MEMBER METHODS ====================

    def add_group_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a member to a group"""
        joined_at = datetime.utcnow().isoformat()

        item = {
            'group_id': member_data['group_id'],
            'user_id': member_data['user_id'],
            'role': member_data.get('role', 'member'),
            'joined_at': joined_at,
            'status': member_data.get('status', 'ACTIVE'),
            'balance': float_to_decimal(member_data.get('balance', 0.0))
        }

        self.group_members_table.put_item(Item=item)
        return decimal_to_float(item)

    def get_user_membership(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's group membership using GSI"""
        response = self.group_members_table.query(
            IndexName='UserIndex',
            KeyConditionExpression=Key('user_id').eq(user_id)
        )
        items = response.get('Items', [])
        if not items:
            return None

        membership = decimal_to_float(items[0])

        # Get group details
        group = self.get_group_by_id(membership['group_id'])
        if group:
            membership['group_name'] = group['name']
            membership['group_invite_code'] = group.get('invite_code', '')

        return membership

    def get_group_members(self, group_id: int) -> List[Dict[str, Any]]:
        """Get all members of a group with user details"""
        response = self.group_members_table.query(
            KeyConditionExpression=Key('group_id').eq(group_id)
        )
        members = response.get('Items', [])

        # Enrich with user details
        result = []
        for member in members:
            member = decimal_to_float(member)
            user = self.get_user_by_id(member['user_id'])
            if user:
                member['email'] = user['email']
                member['display_name'] = user['display_name']
                member['phone'] = user.get('phone', '')
            result.append(member)

        return result

    def get_group_admin_count(self, group_id: int) -> int:
        """Get count of admins in a group"""
        response = self.group_members_table.query(
            KeyConditionExpression=Key('group_id').eq(group_id),
            FilterExpression=Attr('role').eq('admin')
        )
        return len(response.get('Items', []))

    def get_group_member_count(self, group_id: int) -> int:
        """Get total count of members in a group"""
        response = self.group_members_table.query(
            KeyConditionExpression=Key('group_id').eq(group_id),
            Select='COUNT'
        )
        return response.get('Count', 0)

    def update_member_role(self, group_id: int, user_id: str, role: str) -> Dict[str, Any]:
        """Update a member's role"""
        response = self.group_members_table.update_item(
            Key={'group_id': group_id, 'user_id': user_id},
            UpdateExpression='SET #role = :role',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={':role': role},
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    def update_member_balance(self, user_id: str, group_id: int, amount: float) -> None:
        """Update member's balance"""
        self.group_members_table.update_item(
            Key={'group_id': group_id, 'user_id': user_id},
            UpdateExpression='SET balance = balance + :amount',
            ExpressionAttributeValues={':amount': float_to_decimal(amount)}
        )

    def get_user_balance(self, user_id: str, group_id: int) -> float:
        """Get user's balance in a group"""
        response = self.group_members_table.get_item(
            Key={'group_id': group_id, 'user_id': user_id}
        )
        item = response.get('Item')
        if item:
            balance = item.get('balance', Decimal('0'))
            return float(balance)
        return 0.0

    def remove_member(self, user_id: str, group_id: int) -> None:
        """Remove a member from a group"""
        self.group_members_table.delete_item(
            Key={'group_id': group_id, 'user_id': user_id}
        )

    def remove_group_member(self, group_id: int, user_id: str) -> None:
        """Alias for remove_member"""
        self.remove_member(user_id, group_id)

    # ==================== EVENT METHODS ====================

    def create_event(self, event_data: Dict[str, Any]) -> None:
        """Create a new event"""
        # Use the event_id from event_data if provided, otherwise generate one
        event_id = event_data.get('event_id', str(uuid.uuid4()))
        created_at = event_data.get('created_at', datetime.utcnow().isoformat())

        item = {
            'event_id': event_id,
            'group_id': event_data['group_id'],
            'title': event_data['title'],
            'description': event_data.get('description', ''),
            'event_date': event_data['event_date'],
            'event_time': event_data.get('event_time', ''),
            'location': event_data.get('location', ''),
            'event_type': event_data.get('event_type', 'OTHER'),
            'created_by': event_data.get('created_by', ''),
            'created_at': created_at
        }

        self.events_table.put_item(Item=item)

    def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get event by ID"""
        response = self.events_table.get_item(Key={'event_id': event_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_event_by_id"""
        return self.get_event_by_id(event_id)

    def get_group_events(
        self,
        group_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get events for a group with optional filters"""
        # Build query
        key_condition = Key('group_id').eq(group_id)

        if start_date and end_date:
            key_condition = key_condition & Key('event_date').between(start_date, end_date)
        elif start_date:
            key_condition = key_condition & Key('event_date').gte(start_date)
        elif end_date:
            key_condition = key_condition & Key('event_date').lte(end_date)

        query_params = {
            'IndexName': 'GroupIndex',
            'KeyConditionExpression': key_condition
        }

        if event_type:
            query_params['FilterExpression'] = Attr('event_type').eq(event_type)

        response = self.events_table.query(**query_params)
        events = response.get('Items', [])

        # Sort by date descending
        events.sort(key=lambda x: x.get('event_date', ''), reverse=True)

        return decimal_to_float(events)

    def update_event(self, event_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update event information"""
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for key, value in updates.items():
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expr_parts.append(f"{placeholder} = {value_placeholder}")
            expr_attr_names[placeholder] = key
            expr_attr_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(update_expr_parts)

        response = self.events_table.update_item(
            Key={'event_id': event_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    def delete_event(self, event_id: str) -> None:
        """Delete an event"""
        self.events_table.delete_item(Key={'event_id': event_id})

    # ==================== PAYMENT METHODS ====================

    def create_payment(self, payment_data: dict) -> None:
        """Create a new payment and update member balance"""
        # Use the payment_id from payment_data if provided, otherwise generate one
        payment_id = payment_data.get('payment_id', str(uuid.uuid4()))
        created_at = payment_data.get('created_at', datetime.utcnow().isoformat())

        item = {
            'payment_id': payment_id,
            'group_id': payment_data['group_id'],
            'user_id': payment_data['user_id'],
            'user_name': payment_data.get('user_name', ''),
            'amount': float_to_decimal(payment_data['amount']),
            'description': payment_data.get('description', ''),
            'payment_type': payment_data.get('payment_type', 'CHARGE'),
            'status': payment_data.get('status', 'PENDING'),
            'due_date': payment_data.get('due_date', ''),
            'paid_date': payment_data.get('paid_date', ''),
            'created_by': payment_data.get('created_by', ''),
            'created_at': created_at
        }

        self.payments_table.put_item(Item=item)

        # Update member balance
        amount = payment_data['amount']
        payment_type = payment_data.get('payment_type', 'CHARGE')

        if payment_type == 'CHARGE':
            self.update_member_balance(
                payment_data['user_id'],
                payment_data['group_id'],
                amount
            )
        elif payment_type == 'CREDIT':
            self.update_member_balance(
                payment_data['user_id'],
                payment_data['group_id'],
                -amount
            )

    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """Get payment by ID"""
        response = self.payments_table.get_item(Key={'payment_id': payment_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def get_payment_by_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_payment"""
        return self.get_payment(payment_id)

    def get_group_payments(
        self,
        group_id: int,
        user_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get payments for a group with optional filters"""
        query_params = {
            'IndexName': 'GroupIndex',
            'KeyConditionExpression': Key('group_id').eq(group_id)
        }

        filter_expressions = []
        if user_id:
            filter_expressions.append(Attr('user_id').eq(user_id))
        if status:
            filter_expressions.append(Attr('status').eq(status))

        if filter_expressions:
            filter_expr = filter_expressions[0]
            for expr in filter_expressions[1:]:
                filter_expr = filter_expr & expr
            query_params['FilterExpression'] = filter_expr

        response = self.payments_table.query(**query_params)
        return decimal_to_float(response.get('Items', []))

    def get_user_payments(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all payments for a user"""
        # Need to scan since we don't have a user_id GSI on payments
        # In production, consider adding a GSI on user_id
        response = self.payments_table.scan(
            FilterExpression=Attr('user_id').eq(user_id)
        )
        return decimal_to_float(response.get('Items', []))

    def update_payment(self, payment_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update payment information"""
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for key, value in updates.items():
            if key == 'amount':
                value = float_to_decimal(value)
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expr_parts.append(f"{placeholder} = {value_placeholder}")
            expr_attr_names[placeholder] = key
            expr_attr_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(update_expr_parts)

        response = self.payments_table.update_item(
            Key={'payment_id': payment_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    def delete_payment(self, payment_id: str) -> None:
        """Delete a payment and reverse balance changes"""
        # Get payment first to reverse balance
        payment = self.get_payment(payment_id)
        if payment:
            amount = payment['amount']
            payment_type = payment['payment_type']

            # Reverse balance change
            if payment_type == 'CHARGE':
                self.update_member_balance(
                    payment['user_id'],
                    payment['group_id'],
                    -amount
                )
            elif payment_type == 'CREDIT':
                self.update_member_balance(
                    payment['user_id'],
                    payment['group_id'],
                    amount
                )

        self.payments_table.delete_item(Key={'payment_id': payment_id})

    # ==================== MESSAGE METHODS ====================

    def create_message(
        self,
        message_data_or_group_id,
        user_id: str = None,
        user_name: str = None,
        content: str = None
    ) -> Dict[str, Any]:
        """Create a new message (supports both dict and individual params)"""
        if isinstance(message_data_or_group_id, dict):
            message_data = message_data_or_group_id
            # Use the message_id from message_data if provided, otherwise generate one
            message_id = message_data.get('message_id', str(uuid.uuid4()))
            created_at = message_data.get('created_at', datetime.utcnow().isoformat())
            group_id = message_data['group_id']
            user_id = message_data['user_id']
            user_name = message_data.get('user_name', '')
            content = message_data['content']
        else:
            group_id = message_data_or_group_id
            message_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()

        item = {
            'message_id': message_id,
            'group_id': group_id,
            'user_id': user_id,
            'user_name': user_name,
            'content': content,
            'created_at': created_at
        }

        self.messages_table.put_item(Item=item)
        return decimal_to_float(item)

    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get message by ID"""
        response = self.messages_table.get_item(Key={'message_id': message_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def get_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_message"""
        return self.get_message(message_id)

    def get_group_messages(
        self,
        group_id: int,
        limit: int = 50,
        before: str = None
    ) -> List[Dict[str, Any]]:
        """Get messages for a group with pagination"""
        query_params = {
            'IndexName': 'GroupIndex',
            'KeyConditionExpression': Key('group_id').eq(group_id),
            'Limit': limit,
            'ScanIndexForward': False  # Get newest first
        }

        if before:
            # Filter messages created before the specified timestamp
            query_params['FilterExpression'] = Attr('created_at').lt(before)

        response = self.messages_table.query(**query_params)
        messages = response.get('Items', [])

        # Sort by created_at descending
        messages.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return decimal_to_float(messages[:limit])

    def delete_message(self, message_id: str) -> bool:
        """Delete a message"""
        try:
            self.messages_table.delete_item(Key={'message_id': message_id})
            return True
        except Exception:
            return False

    # ==================== PHOTO METHODS ====================

    def create_photo(self, photo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new photo record"""
        # Use the photo_id from photo_data if provided, otherwise generate one
        photo_id = photo_data.get('photo_id', str(uuid.uuid4()))
        uploaded_at = photo_data.get('uploaded_at', datetime.utcnow().isoformat())

        item = {
            'photo_id': photo_id,
            'group_id': photo_data['group_id'],
            'url': photo_data['url'],
            'thumbnail_url': photo_data.get('thumbnail_url', ''),
            'caption': photo_data.get('caption', ''),
            'uploaded_by': photo_data.get('uploaded_by', ''),
            'uploaded_at': uploaded_at
        }

        self.photos_table.put_item(Item=item)
        return decimal_to_float(item)

    def get_photo_by_id(self, photo_id: str) -> Optional[Dict[str, Any]]:
        """Get photo by ID"""
        response = self.photos_table.get_item(Key={'photo_id': photo_id})
        item = response.get('Item')
        return decimal_to_float(item) if item else None

    def get_group_photos(
        self,
        group_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get photos for a group with pagination"""
        response = self.photos_table.query(
            IndexName='GroupIndex',
            KeyConditionExpression=Key('group_id').eq(group_id),
            ScanIndexForward=False  # Get newest first
        )
        photos = response.get('Items', [])

        # Sort by uploaded_at descending
        photos.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)

        # Apply offset and limit
        return decimal_to_float(photos[offset:offset + limit])

    def update_photo(self, photo_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update photo information (typically caption)"""
        update_expr_parts = []
        expr_attr_names = {}
        expr_attr_values = {}

        for key, value in updates.items():
            placeholder = f"#{key}"
            value_placeholder = f":{key}"
            update_expr_parts.append(f"{placeholder} = {value_placeholder}")
            expr_attr_names[placeholder] = key
            expr_attr_values[value_placeholder] = value

        update_expression = "SET " + ", ".join(update_expr_parts)

        response = self.photos_table.update_item(
            Key={'photo_id': photo_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ReturnValues='ALL_NEW'
        )
        return decimal_to_float(response['Attributes'])

    def delete_photo(self, photo_id: str) -> None:
        """Delete a photo"""
        self.photos_table.delete_item(Key={'photo_id': photo_id})

    def get_group_photo_count(self, group_id: int) -> int:
        """Get count of photos in a group"""
        response = self.photos_table.query(
            IndexName='GroupIndex',
            KeyConditionExpression=Key('group_id').eq(group_id),
            Select='COUNT'
        )
        return response.get('Count', 0)
