import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import AdjustmentType, PositionStatus, RiskStatus, UserStatus


class AdminUserRow(BaseModel):
    id: uuid.UUID
    display_id: str  # User-facing ID (e.g., AB1234)
    full_name: str
    email: str
    username: str
    status: UserStatus
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None

    available_balance: Decimal
    locked_balance: Decimal
    total_account_value: Decimal
    total_deposits: Decimal
    total_withdrawals: Decimal
    total_realized_pnl: Decimal
    total_unrealized_pnl: Decimal
    total_trading_volume: Decimal
    open_positions_count: int
    open_orders_count: int
    currency: str
    risk_status: RiskStatus


class AdminUserFinancialProfile(BaseModel):
    user: AdminUserRow
    recent_orders: list[dict]
    open_orders: list[dict]
    trade_history: list[dict]
    position_history: list[dict]
    ledger_entries: list[dict]
    login_history: list[dict]
    active_sessions: list[dict]


class BalanceAdjustmentRequest(BaseModel):
    adjustment_type: AdjustmentType
    # The account to adjust — any of the user's accounts, demo included.
    # Omitted, the adjustment goes to the user's real account.
    account_id: uuid.UUID | None = None
    amount: Decimal = Field(gt=0)
    currency: str = "USD"
    reason: str = Field(min_length=3, max_length=500)
    internal_reference: str | None = None
    notes: str | None = None


class AdminPositionCreate(BaseModel):
    user_id: uuid.UUID
    asset_name: str
    symbol: str
    quantity: Decimal = Field(gt=0)
    entry_price: Decimal = Field(gt=0)
    admin_current_price: Decimal = Field(gt=0)
    invested_amount: Decimal
    admin_current_value: Decimal
    admin_profit_loss: Decimal
    admin_profit_loss_pct: Decimal
    position_status: PositionStatus = PositionStatus.OPEN


class AdminPositionUpdate(BaseModel):
    quantity: Decimal | None = None
    entry_price: Decimal | None = None
    admin_current_price: Decimal | None = None
    admin_current_value: Decimal | None = None
    admin_profit_loss: Decimal | None = None
    admin_profit_loss_pct: Decimal | None = None
    position_status: PositionStatus | None = None


class AdminPositionOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    asset_name: str
    symbol: str
    quantity: Decimal
    entry_price: Decimal
    admin_current_price: Decimal
    invested_amount: Decimal
    admin_current_value: Decimal
    admin_profit_loss: Decimal
    admin_profit_loss_pct: Decimal
    position_status: PositionStatus
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserFinancialSettingsUpdate(BaseModel):
    is_active: bool
    total_account_balance: Decimal
    available_balance: Decimal
    portfolio_value: Decimal
    total_profit: Decimal
    total_loss: Decimal
    net_profit_loss: Decimal
    total_invested_amount: Decimal
    daily_profit_loss: Decimal
    profit_loss_percentage: Decimal
    currency: str = "USD"


class UserFinancialSettingsOut(UserFinancialSettingsUpdate):
    id: uuid.UUID
    user_id: uuid.UUID
    updated_by_admin_id: uuid.UUID | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_type: str
    action: str
    resource_type: str
    resource_id: uuid.UUID | None
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_simulated_trading_volume: Decimal
    open_orders_count: int
    recent_registrations: list[dict]
    recent_trades: list[dict]
