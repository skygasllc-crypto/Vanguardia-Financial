import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.enums import AccountType, OrderSide, OrderStatus, OrderType, PositionStatus


class OrderCreate(BaseModel):
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: Decimal = Field(gt=0)
    price: Decimal | None = Field(default=None, gt=0)
    stop_price: Decimal | None = Field(default=None, gt=0)
    # Optional protective exits ("profit limit" / "stop limit" in the ticket UI).
    take_profit_price: Decimal | None = Field(default=None, gt=0)
    stop_loss_price: Decimal | None = Field(default=None, gt=0)
    account_type: AccountType = AccountType.DEMO
    #: The specific account to trade on. Without it the order lands on the
    #: primary account of `account_type` — which silently ignored the caller's
    #: choice once a user could hold several accounts of the same type.
    account_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_price_requirements(self) -> "OrderCreate":
        if self.order_type in (OrderType.LIMIT, OrderType.STOP_LIMIT) and self.price is None:
            raise ValueError("price is required for limit / stop-limit orders")
        if self.order_type == OrderType.STOP_LIMIT and self.stop_price is None:
            raise ValueError("stop_price is required for stop-limit orders")

        # A bracket that sits on the wrong side of the other is almost always a
        # transposed pair, and silently accepting it would arm an exit that can
        # never be reached in the intended direction.
        tp, sl = self.take_profit_price, self.stop_loss_price
        if tp is not None and sl is not None:
            if self.side == OrderSide.BUY and tp <= sl:
                raise ValueError("take_profit_price must be above stop_loss_price for a buy")
            if self.side == OrderSide.SELL and tp >= sl:
                raise ValueError("take_profit_price must be below stop_loss_price for a sell")
        return self


class OrderOut(BaseModel):
    id: uuid.UUID
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: Decimal
    price: Decimal | None
    stop_price: Decimal | None
    filled_price: Decimal | None
    account_id: uuid.UUID | None = None
    take_profit_price: Decimal | None = None
    stop_loss_price: Decimal | None = None
    status: OrderStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class TradeOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    symbol: str
    side: OrderSide
    quantity: Decimal
    execution_price: Decimal
    total_value: Decimal
    realized_profit_loss: Decimal | None
    executed_at: datetime

    model_config = {"from_attributes": True}


class PositionOut(BaseModel):
    id: uuid.UUID
    symbol: str
    quantity: Decimal
    average_entry_price: Decimal
    total_cost_basis: Decimal
    current_market_price: Decimal
    current_market_value: Decimal
    unrealized_profit_loss: Decimal
    unrealized_profit_loss_pct: Decimal
    account_id: uuid.UUID | None = None
    margin_reserved: Decimal = Decimal(0)
    leverage: int = 1
    take_profit_price: Decimal | None = None
    stop_loss_price: Decimal | None = None
    status: PositionStatus
    opened_at: datetime
    closed_at: datetime | None
    closing_price: Decimal | None
    realized_profit_loss: Decimal | None

    model_config = {"from_attributes": True}


class ClosePositionRequest(BaseModel):
    confirm: bool = True
