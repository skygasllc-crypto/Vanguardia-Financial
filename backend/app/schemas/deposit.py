"""Pydantic schemas for deposit wallet addresses and deposit transactions."""
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import DepositStatus


# ============= Deposit Wallet Schemas =============


class DepositWalletBase(BaseModel):
    currency_id: str = Field(..., min_length=1, max_length=20)
    currency_name: str = Field(..., min_length=1, max_length=100)
    currency_symbol: str = Field(..., min_length=1, max_length=10)
    network: str = Field(..., min_length=1, max_length=50)
    network_fee: str = Field(..., min_length=1, max_length=50)
    icon: str = Field(..., min_length=1, max_length=10)
    wallet_address: str = Field(..., min_length=10, max_length=255)
    memo_tag: str | None = None
    is_active: bool = True
    minimum_deposit: str | None = None
    notes: str | None = None


class DepositWalletCreate(DepositWalletBase):
    """Schema for creating a new deposit wallet."""

    pass


class DepositWalletUpdate(BaseModel):
    """Schema for updating an existing deposit wallet."""

    currency_name: str | None = None
    network: str | None = None
    network_fee: str | None = None
    icon: str | None = None
    wallet_address: str | None = None
    memo_tag: str | None = None
    is_active: bool | None = None
    minimum_deposit: str | None = None
    notes: str | None = None


class DepositWalletPublic(DepositWalletBase):
    """Public-facing deposit wallet information (for users)."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DepositWalletAdmin(DepositWalletPublic):
    """Admin view of deposit wallet (includes all fields)."""

    pass


# ============= Deposit Transaction Schemas =============


class DepositCreate(BaseModel):
    """User initiates a deposit."""

    currency_id: str = Field(..., min_length=1, max_length=20)
    amount: Decimal | None = Field(None, gt=0, description="Optional estimated deposit amount")
    #: Which account to credit. Omitted, the user's primary real account is used.
    account_id: uuid.UUID | None = None


class DepositUpdate(BaseModel):
    """Admin updates a deposit transaction."""

    transaction_hash: str | None = None
    amount: Decimal | None = Field(None, gt=0)
    network_fee: Decimal | None = Field(None, ge=0)
    credited_amount: Decimal | None = Field(None, ge=0)
    status: DepositStatus | None = None
    confirmations: int | None = Field(None, ge=0)
    admin_notes: str | None = None


class DepositPublic(BaseModel):
    """Public deposit transaction information."""

    id: uuid.UUID
    currency_id: str
    currency_symbol: str
    network: str
    deposit_address: str
    transaction_hash: str | None
    amount: Decimal
    network_fee: Decimal | None
    credited_amount: Decimal | None
    status: DepositStatus
    confirmations: int
    required_confirmations: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DepositAdmin(DepositPublic):
    """Admin view of deposit (includes user_id and admin notes)."""

    user_id: uuid.UUID
    admin_notes: str | None


class DepositListResponse(BaseModel):
    """Paginated list of deposits."""

    deposits: list[DepositPublic]
    total: int
    page: int
    per_page: int
