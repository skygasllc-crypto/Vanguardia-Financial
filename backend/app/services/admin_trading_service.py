"""Admin trading manipulation service.

Allows admins to manipulate user positions in real-time:
- Force profit/loss on open positions
- Adjust position prices
- Close positions manually
- All changes are broadcast to users via WebSocket in real-time
"""
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AuditActorType, PositionStatus
from app.models.market_price import MarketPrice
from app.models.position import Position
from app.models.user import User
from app.services.audit_service import record_audit
from app.websocket.events import WSEvent
from app.websocket.publisher import publish_to_user


class AdminTradingError(Exception):
    pass


async def admin_manipulate_position_profit(
    db: AsyncSession,
    admin: User,
    position_id: uuid.UUID,
    target_profit_loss: Decimal,
    reason: str | None = None,
) -> Position:
    """Admin forces a position to show specific profit/loss.

    The user sees their position update in real-time with the new P&L.
    This manipulates the current_market_price to achieve the desired P&L.
    """
    result = await db.execute(select(Position).where(Position.id == position_id))
    position = result.scalar_one_or_none()

    if position is None:
        raise AdminTradingError("Position not found")

    if position.status != PositionStatus.OPEN:
        raise AdminTradingError("Can only manipulate open positions")

    # Calculate the required market price to achieve target P&L
    # target_profit_loss = (new_price - entry_price) * quantity
    # new_price = entry_price + (target_profit_loss / quantity)
    required_price = position.average_entry_price + (target_profit_loss / position.quantity)

    if required_price <= 0:
        raise AdminTradingError("Calculated price would be negative or zero")

    # Store old values for audit
    old_price = position.current_market_price
    old_pnl = position.unrealized_profit_loss

    # Update position with manipulated values. Pinned so the market engine
    # stops repricing it; otherwise the next tick replaced this price and the
    # user's P&L snapped back to the market within seconds.
    position.admin_price_override = required_price
    position.current_market_price = required_price
    position.current_market_value = required_price * position.quantity
    position.unrealized_profit_loss = target_profit_loss
    position.unrealized_profit_loss_pct = (target_profit_loss / position.total_cost_basis) * 100

    # Record audit trail
    await record_audit(
        db,
        actor_id=admin.id,
        actor_type=AuditActorType.ADMIN,
        action="ADMIN_POSITION_MANIPULATE",
        resource_type="position",
        resource_id=position.id,
        previous_data={
            "current_price": float(old_price),
            "unrealized_pnl": float(old_pnl),
        },
        new_data={
            "current_price": float(required_price),
            "unrealized_pnl": float(target_profit_loss),
            "reason": reason or "Admin manipulation",
            "admin_email": admin.email,
        },
    )

    await db.commit()
    await db.refresh(position)

    # Broadcast update to user in real-time via WebSocket
    payload = {
        "id": str(position.id),
        "symbol": position.symbol,
        "quantity": float(position.quantity),
        "average_entry_price": float(position.average_entry_price),
        "current_market_price": float(position.current_market_price),
        "current_market_value": float(position.current_market_value),
        "unrealized_profit_loss": float(position.unrealized_profit_loss),
        "unrealized_profit_loss_pct": float(position.unrealized_profit_loss_pct),
        "status": position.status.value,
        "admin_manipulated": True,
    }
    print(f"[DEBUG] Admin manipulated position {position.id} for user {position.user_id}")
    print(f"[DEBUG] Broadcasting WebSocket event: {WSEvent.POSITION_UPDATED}")
    print(f"[DEBUG] Payload: {payload}")
    await publish_to_user(position.user_id, WSEvent.POSITION_UPDATED, payload)

    return position


async def admin_force_profit(
    db: AsyncSession,
    admin: User,
    position_id: uuid.UUID,
    profit_amount: Decimal,
    reason: str | None = None,
) -> Position:
    """Make user gain money (positive P&L).

    Example: Admin clicks "Profit $500" button -> user sees +$500 profit
    """
    return await admin_manipulate_position_profit(
        db, admin, position_id, profit_amount, reason or "Admin forced profit"
    )


async def admin_force_loss(
    db: AsyncSession,
    admin: User,
    position_id: uuid.UUID,
    loss_amount: Decimal,
    reason: str | None = None,
) -> Position:
    """Make user lose money (negative P&L).

    Example: Admin clicks "Loss $500" button -> user sees -$500 loss
    """
    # Loss should be negative
    if loss_amount > 0:
        loss_amount = -loss_amount

    return await admin_manipulate_position_profit(
        db, admin, position_id, loss_amount, reason or "Admin forced loss"
    )


async def admin_set_position_price(
    db: AsyncSession,
    admin: User,
    position_id: uuid.UUID,
    new_price: Decimal,
    reason: str | None = None,
) -> Position:
    """Admin directly sets the current market price of a position.

    This updates the P&L automatically based on the new price.
    """
    result = await db.execute(select(Position).where(Position.id == position_id))
    position = result.scalar_one_or_none()

    if position is None:
        raise AdminTradingError("Position not found")

    if position.status != PositionStatus.OPEN:
        raise AdminTradingError("Can only manipulate open positions")

    if new_price <= 0:
        raise AdminTradingError("Price must be positive")

    old_price = position.current_market_price
    old_pnl = position.unrealized_profit_loss

    # Update position, pinned at the admin's price for the same reason as above.
    position.admin_price_override = new_price
    position.current_market_price = new_price
    position.current_market_value = new_price * position.quantity
    position.unrealized_profit_loss = position.current_market_value - position.total_cost_basis
    position.unrealized_profit_loss_pct = (position.unrealized_profit_loss / position.total_cost_basis) * 100

    await record_audit(
        db,
        actor_id=admin.id,
        actor_type=AuditActorType.ADMIN,
        action="ADMIN_POSITION_PRICE_SET",
        resource_type="position",
        resource_id=position.id,
        previous_data={
            "current_price": float(old_price),
            "unrealized_pnl": float(old_pnl),
        },
        new_data={
            "current_price": float(new_price),
            "unrealized_pnl": float(position.unrealized_profit_loss),
            "reason": reason or "Admin set price",
            "admin_email": admin.email,
        },
    )

    await db.commit()
    await db.refresh(position)

    # Broadcast to user
    payload = {
        "id": str(position.id),
        "symbol": position.symbol,
        "quantity": float(position.quantity),
        "average_entry_price": float(position.average_entry_price),
        "current_market_price": float(position.current_market_price),
        "current_market_value": float(position.current_market_value),
        "unrealized_profit_loss": float(position.unrealized_profit_loss),
        "unrealized_profit_loss_pct": float(position.unrealized_profit_loss_pct),
        "status": position.status.value,
        "admin_manipulated": True,
    }
    print(f"[DEBUG] Admin set price for position {position.id} for user {position.user_id}")
    print(f"[DEBUG] Broadcasting WebSocket event: {WSEvent.POSITION_UPDATED}")
    print(f"[DEBUG] Payload: {payload}")
    await publish_to_user(position.user_id, WSEvent.POSITION_UPDATED, payload)

    return position


async def admin_unpin_position(
    db: AsyncSession,
    admin: User,
    position_id: uuid.UUID,
    reason: str | None = None,
) -> Position:
    """Release a position an admin pinned, returning it to the market.

    Repriced at the current market price straight away rather than on the next
    engine tick, so the user's P&L returns to the market figure the moment the
    admin unpins it.
    """
    result = await db.execute(select(Position).where(Position.id == position_id))
    position = result.scalar_one_or_none()

    if position is None:
        raise AdminTradingError("Position not found")

    if position.status != PositionStatus.OPEN:
        raise AdminTradingError("Can only unpin open positions")

    if position.admin_price_override is None:
        raise AdminTradingError("Position is not pinned")

    market_price = (await db.execute(
        select(MarketPrice).where(MarketPrice.asset_id == position.asset_id)
    )).scalar_one_or_none()
    if market_price is None:
        raise AdminTradingError("No market price available for this asset")

    old_price = position.current_market_price
    old_pnl = position.unrealized_profit_loss
    pinned_price = position.admin_price_override
    new_price = market_price.current_price

    position.admin_price_override = None
    position.current_market_price = new_price
    position.current_market_value = (position.quantity * new_price).quantize(Decimal("0.01"))
    position.unrealized_profit_loss = position.current_market_value - position.total_cost_basis
    position.unrealized_profit_loss_pct = (
        (position.unrealized_profit_loss / position.total_cost_basis * 100)
        if position.total_cost_basis else Decimal(0)
    )

    await record_audit(
        db,
        actor_id=admin.id,
        actor_type=AuditActorType.ADMIN,
        action="ADMIN_POSITION_UNPIN",
        resource_type="position",
        resource_id=position.id,
        previous_data={
            "current_price": float(old_price),
            "unrealized_pnl": float(old_pnl),
            "pinned_price": float(pinned_price),
        },
        new_data={
            "current_price": float(new_price),
            "unrealized_pnl": float(position.unrealized_profit_loss),
            "reason": reason or "Admin unpinned position",
            "admin_email": admin.email,
        },
    )

    await db.commit()
    await db.refresh(position)

    await publish_to_user(position.user_id, WSEvent.POSITION_UPDATED, {
        "id": str(position.id),
        "symbol": position.symbol,
        "current_market_price": str(position.current_market_price),
        "current_market_value": str(position.current_market_value),
        "unrealized_profit_loss": str(position.unrealized_profit_loss),
        "unrealized_profit_loss_pct": str(position.unrealized_profit_loss_pct),
        "status": position.status.value,
    })

    return position
