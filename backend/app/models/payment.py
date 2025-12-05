from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class PaymentType(str, Enum):
    CHARGE = "CHARGE"
    CREDIT = "CREDIT"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    OVERDUE = "OVERDUE"

class PaymentCreate(BaseModel):
    memberId: str
    description: str
    amount: float
    type: PaymentType = PaymentType.CHARGE
    dueDate: Optional[str] = None

class BulkPaymentCreate(BaseModel):
    memberIds: List[str]
    description: str
    amount: float
    dueDate: Optional[str] = None

class Payment(BaseModel):
    id: str
    groupId: str
    memberId: str
    memberName: str
    description: str
    amount: float
    type: PaymentType
    dueDate: Optional[str] = None
    status: PaymentStatus
    paidDate: Optional[str] = None
    createdAt: str

class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    paidDate: Optional[str] = None