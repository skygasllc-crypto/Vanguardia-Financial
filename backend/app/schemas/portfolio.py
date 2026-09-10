from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import DataSource
from app.schemas.trading import PositionOut


class AllocationSlice(BaseModel):
    symbol: str
    name: str
    value: Decimal
    percentage: Decimal


class PortfolioHistoryPoint(BaseModel):
    timestamp: int
    value: Decimal


class PortfolioSummary(BaseModel):
    data_source: DataSource
    total_portfolio_value: Decimal
    available_cash_balance: Decimal
    locked_balance: Decimal
    value_of_crypto_assets: Decimal
    total_unrealized_profit_loss: Decimal
    total_realized_profit_loss: Decimal
    total_profit_loss: Decimal
    total_profit_loss_pct: Decimal
    daily_profit_loss: Decimal
    daily_profit_loss_pct: Decimal
    currency: str
    allocation: list[AllocationSlice]
    positions: list[PositionOut]
    history: list[PortfolioHistoryPoint] = []
