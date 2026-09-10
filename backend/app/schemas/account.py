import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import AccountType


class AccountOut(BaseModel):
    """One account card: identity, money, and the margin picture."""

    id: uuid.UUID
    account_number: str
    label: str | None = None
    currency: str
    account_type: AccountType
    is_primary: bool
    is_active: bool

    balance: Decimal
    #: Locked behind a pending or approved withdrawal.
    held: Decimal = Decimal(0)
    bonus: Decimal
    #: Balance less outstanding bonus and reserved margin.
    withdrawable: Decimal
    #: Balance plus unrealised P&L.
    equity: Decimal

    leverage: int
    margin_used: Decimal
    free_margin: Decimal
    #: equity / margin_used as a percentage. None when nothing is open, which
    #: is not the same as zero.
    margin_level: Decimal | None = None
    margin_call: bool = False
    stop_out: bool = False

    unrealized_pnl: Decimal
    realized_pnl: Decimal
    total_pnl: Decimal
    open_positions: int
    created_at: datetime


class AccountCreate(BaseModel):
    account_type: AccountType = AccountType.DEMO
    label: str | None = Field(default=None, max_length=60)
    currency: str | None = Field(default=None, max_length=10)
    leverage: int = 1


class AccountUpdate(BaseModel):
    """What the account holder may change themselves. Leverage is absent on
    purpose — it is set by an admin."""

    label: str | None = Field(default=None, max_length=60)
    is_primary: bool | None = None


class AdminLeverageUpdate(BaseModel):
    leverage: int
    reason: str | None = Field(default=None, max_length=500)


class AdminBonusUpdate(BaseModel):
    """Credit or remove promotional funds."""

    amount: Decimal
    reason: str = Field(max_length=500)


class EquityPoint(BaseModel):
    taken_at: datetime
    balance: Decimal
    equity: Decimal
    margin_used: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal

    model_config = {"from_attributes": True}
