from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.services.db_service import get_db_service
from app.api.auth import get_current_user_id

router = APIRouter()

# Request/Response Models
class PaymentResponse(BaseModel):
    payment_id: str
    group_id: int
    user_id: str
    user_name: str
    amount: float
    description: str
    payment_type: str  # CHARGE or CREDIT
    status: str  # PENDING, PAID, OVERDUE
    due_date: Optional[str] = None
    paid_date: Optional[str] = None
    created_by: str
    created_at: str

class CreatePaymentRequest(BaseModel):
    user_id: str
    amount: float
    description: str
    payment_type: str = "CHARGE"  # CHARGE or CREDIT
    due_date: Optional[str] = None

class BulkChargeRequest(BaseModel):
    user_ids: List[str]
    amount: float
    description: str
    due_date: Optional[str] = None

class UpdatePaymentStatusRequest(BaseModel):
    status: str  # PENDING, PAID, OVERDUE

class MemberBalanceResponse(BaseModel):
    user_id: str
    user_name: str
    balance: float


@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    user_id_filter: Optional[str] = None,
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get payments for user's group
    - Admin can see all payments
    - Members can only see their own payments
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # If not admin, only show user's own payments
        if not is_admin:
            user_id_filter = user_id
        
        # Get payments
        payments = db.get_group_payments(
            group_id,
            user_id=user_id_filter,
            status=status
        )
        
        # Add user names
        payment_list = []
        for payment in payments:
            user = db.get_user_by_id(payment['user_id'])
            payment_list.append(PaymentResponse(
                **payment,
                user_name=user.get('display_name', user['email']) if user else 'Unknown'
            ))
        
        return payment_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances", response_model=List[MemberBalanceResponse])
async def get_member_balances(user_id: str = Depends(get_current_user_id)):
    """
    Get balance for all members (admin only)
    Balance = sum of CREDITS - sum of PENDING/OVERDUE CHARGES
    Negative balance means member owes money
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Get all members
        members = db.get_group_members(group_id)
        
        balances = []
        for member in members:
            user = db.get_user_by_id(member['user_id'])
            if not user:
                continue
            
            # Calculate balance
            balance = db.get_user_balance(group_id, member['user_id'])
            
            balances.append(MemberBalanceResponse(
                user_id=member['user_id'],
                user_name=user.get('display_name', user['email']),
                balance=balance
            ))
        
        return balances
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-balance")
async def get_my_balance(user_id: str = Depends(get_current_user_id)):
    """
    Get current user's balance
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        balance = db.get_user_balance(group_id, user_id)
        
        return {"balance": balance}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get specific payment details
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # Get payment
        payment = db.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Verify payment belongs to user's group
        if payment['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Non-admin can only view their own payments
        if not is_admin and payment['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Add user name
        user = db.get_user_by_id(payment['user_id'])
        
        return PaymentResponse(
            **payment,
            user_name=user.get('display_name', user['email']) if user else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    request: CreatePaymentRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create new payment/charge (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Validate payment type
        if request.payment_type not in ['CHARGE', 'CREDIT']:
            raise HTTPException(status_code=400, detail="Invalid payment type")
        
        # Verify target user is in group
        target_membership = db.get_user_membership(request.user_id)
        if not target_membership or target_membership['group_id'] != group_id:
            raise HTTPException(status_code=404, detail="User not in your group")
        
        # Create payment
        payment_id = str(uuid.uuid4())
        payment_data = {
            'payment_id': payment_id,
            'group_id': group_id,
            'user_id': request.user_id,
            'amount': request.amount,
            'description': request.description,
            'payment_type': request.payment_type,
            'status': 'PENDING',
            'due_date': request.due_date,
            'created_by': user_id,
            'created_at': datetime.utcnow().isoformat()
        }
        
        db.create_payment(payment_data)
        
        # Return created payment
        payment = db.get_payment_by_id(payment_id)
        user = db.get_user_by_id(request.user_id)
        
        return PaymentResponse(
            **payment,
            user_name=user.get('display_name', user['email']) if user else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-charge", response_model=List[PaymentResponse])
async def create_bulk_charge(
    request: BulkChargeRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create charges for multiple members (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        if not request.user_ids:
            raise HTTPException(status_code=400, detail="No users selected")
        
        created_payments = []
        
        for target_user_id in request.user_ids:
            # Verify user is in group
            target_membership = db.get_user_membership(target_user_id)
            if not target_membership or target_membership['group_id'] != group_id:
                continue  # Skip users not in group
            
            # Create payment
            payment_id = str(uuid.uuid4())
            payment_data = {
                'payment_id': payment_id,
                'group_id': group_id,
                'user_id': target_user_id,
                'amount': request.amount,
                'description': request.description,
                'payment_type': 'CHARGE',
                'status': 'PENDING',
                'due_date': request.due_date,
                'created_by': user_id,
                'created_at': datetime.utcnow().isoformat()
            }
            
            db.create_payment(payment_data)
            
            # Get created payment
            payment = db.get_payment_by_id(payment_id)
            user = db.get_user_by_id(target_user_id)
            
            created_payments.append(PaymentResponse(
                **payment,
                user_name=user.get('display_name', user['email']) if user else 'Unknown'
            ))
        
        return created_payments
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{payment_id}/status", response_model=PaymentResponse)
async def update_payment_status(
    payment_id: str,
    request: UpdatePaymentStatusRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update payment status
    - Admin can update any payment
    - Member can mark their own charges as PAID
    """
    try:
        db = get_db_service()
        
        membership = db.get_user_membership(user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="User not in any group")
        
        group_id = membership['group_id']
        is_admin = membership['role'] == 'admin'
        
        # Get payment
        payment = db.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Verify payment belongs to user's group
        if payment['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check permissions
        is_own_payment = payment['user_id'] == user_id
        is_marking_paid = request.status == 'PAID'
        
        if not is_admin and not (is_own_payment and is_marking_paid):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Validate status
        valid_statuses = ['PENDING', 'PAID', 'OVERDUE']
        if request.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        # Update status
        update_data = {'status': request.status}
        if request.status == 'PAID':
            update_data['paid_date'] = datetime.utcnow().date().isoformat()
        
        db.update_payment(payment_id, update_data)
        
        # Return updated payment
        payment = db.get_payment_by_id(payment_id)
        user = db.get_user_by_id(payment['user_id'])
        
        return PaymentResponse(
            **payment,
            user_name=user.get('display_name', user['email']) if user else 'Unknown'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{payment_id}")
async def delete_payment(payment_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Delete payment (admin only)
    """
    try:
        db = get_db_service()
        
        # Check if user is admin
        membership = db.get_user_membership(user_id)
        if not membership or membership['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        group_id = membership['group_id']
        
        # Get payment
        payment = db.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Verify payment belongs to user's group
        if payment['group_id'] != group_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete payment
        db.delete_payment(payment_id)
        
        return {"ok": True, "message": "Payment deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))