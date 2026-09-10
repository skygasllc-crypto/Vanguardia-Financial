"""Builds the portfolio summary shown on the dashboard / portfolio page.

If an admin has activated a `UserFinancialSettings` override for this user,
those figures are served instead of the engine-computed ones, and the
response is tagged `data_source: admin_managed` so the UI can render the
required "Admin-managed" disclosure (see the platform's transparency rule).
Otherwise every figure is derived live from the ledger and open positions.
"""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_position import AdminPosition
from app.models.asset import Asset
from app.models.enums import DataSource, PositionStatus
from app.models.position import Position
from app.models.trade import Trade
from app.models.user_financial_settings import UserFinancialSettings
from app.schemas.portfolio import AllocationSlice, PortfolioSummary
from app.schemas.trading import PositionOut
from app.services.trading_service import get_or_create_account


async def build_portfolio_summary(db: AsyncSession, user_id, account_type: str = "demo") -> PortfolioSummary:
    settings_result = await db.execute(select(UserFinancialSettings).where(UserFinancialSettings.user_id == user_id))
    override = settings_result.scalar_one_or_none()

    if override is not None and override.is_active:
        return await _build_admin_managed_summary(db, user_id, override, account_type)
    return await _build_engine_summary(db, user_id, account_type)


async def _build_engine_summary(db: AsyncSession, user_id, account_type: str = "demo") -> PortfolioSummary:
    account = await get_or_create_account(db, user_id, account_type)

    positions_result = await db.execute(
        select(Position).where(
            Position.user_id == user_id,
            Position.status == PositionStatus.OPEN,
            Position.account_type == account_type
        )
    )
    open_positions = positions_result.scalars().all()

    realized_result = await db.execute(select(Trade.realized_profit_loss).where(Trade.user_id == user_id))
    total_realized = sum((r[0] for r in realized_result.all() if r[0] is not None), Decimal(0))

    value_of_crypto = sum((p.current_market_value for p in open_positions), Decimal(0))
    total_unrealized = sum((p.unrealized_profit_loss for p in open_positions), Decimal(0))
    total_invested = sum((p.total_cost_basis for p in open_positions), Decimal(0))
    total_portfolio_value = account.available_balance + account.locked_balance + value_of_crypto
    total_pl = total_realized + total_unrealized
    total_pl_pct = (total_unrealized / total_invested * 100) if total_invested else Decimal(0)

    allocation: list[AllocationSlice] = []
    if value_of_crypto > 0:
        for position in open_positions:
            asset = (await db.execute(select(Asset).where(Asset.symbol == position.symbol))).scalar_one_or_none()
            allocation.append(AllocationSlice(
                symbol=position.symbol,
                name=asset.name if asset else position.symbol,
                value=position.current_market_value,
                percentage=(position.current_market_value / value_of_crypto * 100),
            ))

    return PortfolioSummary(
        data_source=DataSource.ENGINE,
        total_portfolio_value=total_portfolio_value,
        available_cash_balance=account.available_balance,
        locked_balance=account.locked_balance,
        value_of_crypto_assets=value_of_crypto,
        total_unrealized_profit_loss=total_unrealized,
        total_realized_profit_loss=total_realized,
        total_profit_loss=total_pl,
        total_profit_loss_pct=total_pl_pct,
        daily_profit_loss=total_unrealized,
        daily_profit_loss_pct=total_pl_pct,
        currency=account.currency,
        allocation=allocation,
        positions=[PositionOut.model_validate(p) for p in open_positions],
    )


async def _build_admin_managed_summary(db: AsyncSession, user_id, override: UserFinancialSettings, account_type: str = "demo") -> PortfolioSummary:
    admin_positions_result = await db.execute(
        select(AdminPosition).where(
            AdminPosition.user_id == user_id,
            AdminPosition.position_status == PositionStatus.OPEN,
            AdminPosition.account_type == account_type
        )
    )
    admin_positions = admin_positions_result.scalars().all()

    allocation: list[AllocationSlice] = []
    if override.portfolio_value > 0:
        for p in admin_positions:
            allocation.append(AllocationSlice(
                symbol=p.symbol, name=p.asset_name, value=p.admin_current_value,
                percentage=(p.admin_current_value / override.portfolio_value * 100) if override.portfolio_value else Decimal(0),
            ))

    positions_out = [
        PositionOut(
            id=p.id, symbol=p.symbol, quantity=p.quantity, average_entry_price=p.entry_price,
            total_cost_basis=p.invested_amount, current_market_price=p.admin_current_price,
            current_market_value=p.admin_current_value, unrealized_profit_loss=p.admin_profit_loss,
            unrealized_profit_loss_pct=p.admin_profit_loss_pct, status=p.position_status,
            opened_at=p.created_at, closed_at=None, closing_price=None, realized_profit_loss=None,
        )
        for p in admin_positions
    ]

    return PortfolioSummary(
        data_source=DataSource.ADMIN_MANAGED,
        total_portfolio_value=override.total_account_balance,
        available_cash_balance=override.available_balance,
        locked_balance=Decimal(0),
        value_of_crypto_assets=override.portfolio_value,
        total_unrealized_profit_loss=override.total_profit - override.total_loss,
        total_realized_profit_loss=Decimal(0),
        total_profit_loss=override.net_profit_loss,
        total_profit_loss_pct=override.profit_loss_percentage,
        daily_profit_loss=override.daily_profit_loss,
        daily_profit_loss_pct=override.profit_loss_percentage,
        currency=override.currency,
        allocation=allocation,
        positions=positions_out,
    )
