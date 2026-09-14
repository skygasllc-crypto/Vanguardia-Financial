"""Builds the portfolio summary shown on the dashboard / portfolio page.

If an admin has activated a `UserFinancialSettings` override for this user,
those figures are served instead of the engine-computed ones, and the
response is tagged `data_source: admin_managed` so the UI can render the
required "Admin-managed" disclosure (see the platform's transparency rule).
Otherwise every figure is derived live from the ledger and open positions.
"""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_position import AdminPosition
from app.models.asset import Asset
from app.models.enums import DataSource, PositionStatus, TransactionType
from app.models.position import Position
from app.models.trade import Trade
from app.models.user_financial_settings import UserFinancialSettings
from app.schemas.portfolio import AllocationSlice, PortfolioSummary
from app.schemas.trading import PositionOut
from app.services.trading_service import get_or_create_account


async def build_portfolio_summary(db: AsyncSession, user_id, account_type: str = "demo", account_id=None) -> PortfolioSummary:
    settings_result = await db.execute(select(UserFinancialSettings).where(UserFinancialSettings.user_id == user_id))
    override = settings_result.scalar_one_or_none()

    if override is not None and override.is_active:
        return await _build_admin_managed_summary(db, user_id, override, account_type)
    return await _build_engine_summary(db, user_id, account_type, account_id)


async def _build_engine_summary(
    db: AsyncSession, user_id, account_type: str = "demo", account_id=None
) -> PortfolioSummary:
    """Portfolio figures for one account.

    Scoped to a single account rather than to an account *type*: a user may
    hold several of each, and the previous version took the balance from one
    account while summing positions across all of them, then computed realised
    P&L from every trade the user had ever made with no account filter at all.
    The result was a dashboard that could not agree with the account page.

    Realised P&L is read from closed positions, the same source
    `account_service.account_metrics` uses, so the two screens cannot diverge.
    """
    from datetime import datetime, timedelta, timezone

    from app.models.equity_snapshot import EquitySnapshot
    from app.services.account_service import resolve_account

    account = await resolve_account(db, user_id, account_id=account_id, account_type=account_type)

    open_positions = (await db.execute(
        select(Position).where(
            Position.account_id == account.id,
            Position.status == PositionStatus.OPEN,
        )
    )).scalars().all()

    total_realized = Decimal(str((await db.execute(
        select(func.coalesce(func.sum(Position.realized_profit_loss), 0)).where(
            Position.account_id == account.id,
            Position.status == PositionStatus.CLOSED,
        )
    )).scalar() or 0))

    value_of_crypto = sum((p.current_market_value for p in open_positions), Decimal(0))
    total_unrealized = sum((p.unrealized_profit_loss for p in open_positions), Decimal(0))
    total_invested = sum((p.total_cost_basis for p in open_positions), Decimal(0))
    total_portfolio_value = account.available_balance + account.locked_balance + value_of_crypto
    total_pl = total_realized + total_unrealized
    total_pl_pct = (total_unrealized / total_invested * 100) if total_invested else Decimal(0)

    # A genuine day's change, measured against the first equity snapshot of the
    # last 24 hours. Previously this reported total unrealised P&L, which is
    # not a daily figure at all — a position held for a month showed its whole
    # lifetime gain as "today".
    from app.models.transaction_ledger import TransactionLedger

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    opening_row = (await db.execute(
        select(EquitySnapshot.equity, EquitySnapshot.taken_at)
        .where(EquitySnapshot.account_id == account.id, EquitySnapshot.taken_at >= since)
        .order_by(EquitySnapshot.taken_at)
        .limit(1)
    )).first()

    # Held funds are still the user's, so equity counts them — matching
    # `account_metrics`, which is what wrote the snapshot being compared
    # against. Leaving `locked_balance` out here would read a withdrawal
    # request as an instant loss.
    current_equity = account.available_balance + account.locked_balance + total_unrealized

    if opening_row is not None and Decimal(str(opening_row[0])) > 0:
        opening = Decimal(str(opening_row[0]))

        # Money moving in or out is not performance. Without this a $10,000
        # deposit reads as a $10,000 profit for the day, and an approved
        # withdrawal as a loss of the same size. Trading entries are left in —
        # those are the actual result. `amount` is stored unsigned, so the
        # signed movement comes from the balance either side of the entry.
        external = Decimal(str((await db.execute(
            select(func.coalesce(func.sum(TransactionLedger.balance_after - TransactionLedger.balance_before), 0))
            .where(
                TransactionLedger.account_id == account.id,
                TransactionLedger.created_at >= opening_row[1],
                TransactionLedger.transaction_type.in_((
                    TransactionType.DEPOSIT,
                    TransactionType.WITHDRAWAL,
                    TransactionType.ADMIN_CREDIT,
                    TransactionType.ADMIN_DEBIT,
                )),
            )
        )).scalar() or 0))

        daily_pl = (current_equity - opening - external).quantize(Decimal("0.01"))
        daily_pl_pct = (daily_pl / opening * 100).quantize(Decimal("0.01"))
    else:
        # No snapshot yet — say nothing rather than invent a number.
        daily_pl = Decimal(0)
        daily_pl_pct = Decimal(0)

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
        daily_profit_loss=daily_pl,
        daily_profit_loss_pct=daily_pl_pct,
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
