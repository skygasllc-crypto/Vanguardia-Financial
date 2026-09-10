"""Margin monitoring: stop-outs and the equity curve.

Both run off the market tick rather than a separate clock, because both are
functions of price. A margin level is only meaningful against current prices,
and an equity snapshot taken between ticks would record a figure the account
never actually had.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import PositionStatus
from app.models.equity_snapshot import EquitySnapshot
from app.models.position import Position
from app.models.user import User
from app.services.account_service import STOP_OUT_LEVEL, account_metrics, recompute_margin

logger = logging.getLogger(__name__)


async def enforce_stop_outs(db: AsyncSession) -> int:
    """Force-close positions on accounts that have fallen through stop-out.

    Closes worst-loss-first and re-checks after each one, because a single
    close often lifts the level back above the threshold. Liquidating the whole
    book when one position would have done is the behaviour traders most
    resent, and it is not what a real stop-out does.
    """
    from app.services.trading_service import TradingError, close_position_at_market

    closed = 0
    accounts = (await db.execute(
        select(Account).where(Account.is_active == True, Account.margin_used > 0)  # noqa: E712
    )).scalars().all()

    for account in accounts:
        metrics = await account_metrics(db, account)
        if not metrics["stop_out"]:
            continue

        user = await db.get(User, account.user_id)
        if user is None:
            continue

        logger.warning(
            "Stop-out on %s: margin level %.2f%% below %s%%",
            account.account_number, metrics["margin_level"], STOP_OUT_LEVEL,
        )

        while True:
            worst = (await db.execute(
                select(Position).where(
                    Position.account_id == account.id,
                    Position.status == PositionStatus.OPEN,
                ).order_by(Position.unrealized_profit_loss)
            )).scalars().first()
            if worst is None:
                break
            try:
                await close_position_at_market(db, user, worst.id)
                closed += 1
            except TradingError:
                break
            await recompute_margin(db, account)
            if not (await account_metrics(db, account))["stop_out"]:
                break

    if closed:
        await db.commit()
    return closed


async def write_equity_snapshots(db: AsyncSession) -> int:
    """Record one equity point per active account."""
    now = datetime.now(timezone.utc)
    accounts = (await db.execute(
        select(Account).where(Account.is_active == True)  # noqa: E712
    )).scalars().all()

    written = 0
    for account in accounts:
        m = await account_metrics(db, account)
        # Skip untouched accounts: a demo account nobody has traded would
        # otherwise fill the table with a flat line at its opening balance.
        if m["open_positions"] == 0 and m["realized_pnl"] == 0 and m["balance"] == 0:
            continue
        db.add(EquitySnapshot(
            account_id=account.id,
            taken_at=now,
            balance=m["balance"],
            equity=m["equity"],
            margin_used=m["margin_used"],
            unrealized_pnl=m["unrealized_pnl"],
            realized_pnl=m["realized_pnl"],
            open_positions=m["open_positions"],
        ))
        written += 1

    if written:
        await db.commit()
    return written


async def prune_snapshots(db: AsyncSession, keep_days: int = 90) -> int:
    """Drop points older than the retention window."""
    cutoff = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=keep_days)
    result = await db.execute(
        EquitySnapshot.__table__.delete().where(EquitySnapshot.taken_at < cutoff)
    )
    await db.commit()
    return result.rowcount or 0
