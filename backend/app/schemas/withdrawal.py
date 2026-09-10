import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import WithdrawalStatus


class WithdrawalCreate(BaseModel):
    account_id: uuid.UUID
    amount: Decimal = Field(gt=0)
    #: "BTC", "USDT", "TRX" or "bank".
    method: str = Field(min_length=1, max_length=40)
    #: Crypto address, or bank details for a transfer.
    destination: str = Field(min_length=1, max_length=500)
    destination_memo: str | None = Field(default=None, max_length=120)
    user_note: str | None = Field(default=None, max_length=500)


class WithdrawalOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    currency: str
    amount: Decimal
    fee: Decimal
    #: What the user receives, after the fee.
    net_amount: Decimal
    method: str
    destination: str
    destination_memo: str | None = None
    status: WithdrawalStatus
    user_note: str | None = None
    admin_note: str | None = None
    rejection_reason: str | None = None
    transaction_reference: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class WithdrawalQuote(BaseModel):
    """What a withdrawal of this size would cost, shown before confirming."""

    currency: str
    withdrawable: Decimal
    minimum: Decimal
    fee: Decimal
    net_amount: Decimal


class AdminWithdrawalRow(WithdrawalOut):
    """A queue row, with enough context to decide without opening the user."""

    user_email: str
    user_full_name: str
    account_number: str


class WithdrawalReject(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class WithdrawalApprove(BaseModel):
    admin_note: str | None = Field(default=None, max_length=1000)


class WithdrawalComplete(BaseModel):
    transaction_reference: str | None = Field(default=None, max_length=255)
