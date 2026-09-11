"""The paper trading engine: order placement, fills, position bookkeeping,
and the buy/sell flows exactly as specified —

Buy: validate balance -> create order -> execute trade -> update/create
position -> ledger transaction -> update balance -> publish WS events.

Sell / close: validate quantity -> create order -> execute trade ->
calculate realized P&L -> update/close position -> ledger transaction ->
update balance -> publish WS events.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.account import Account
from app.models.asset import Asset
from app.models.enums import OrderSide, OrderStatus, OrderType, PositionStatus, TransactionType
from app.models.market_price import MarketPrice
from app.models.order import Order
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trading import OrderCreate
from app.services.ledger_service import InsufficientBalanceError, apply_ledger_transaction
from app.websocket.events import WSEvent
from app.websocket.publisher import publish_to_user


class TradingError(Exception):
    pass


async def get_or_create_account(db: AsyncSession, user_id: uuid.UUID, account_type: str = "demo", currency: str | None = None) -> Account:
    """Get or create an account for a user.

    Args:
        db: Database session
        user_id: User UUID
        account_type: "demo" or "real"
        currency: Currency code (defaults to settings.DEFAULT_ACCOUNT_CURRENCY if not provided)
    """
    account_currency = currency or settings.DEFAULT_ACCOUNT_CURRENCY

    result = await db.execute(
        select(Account).where(
            Account.user_id == user_id,
            Account.currency == account_currency,
            Account.account_type == account_type
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        # For crypto deposits, start with 0 balance. For USD/fiat accounts, use starting balance
        starting_balance = Decimal(0) if currency and currency != "USD" else settings.STARTING_PAPER_BALANCE

        # Opened through `create_account` rather than built here: that is the
        # only place which allocates `account_number`, which is NOT NULL since
        # multi-account. Constructing the row inline failed the constraint the
        # moment this path was reached — a deposit in a currency the user had
        # no account for.
        from app.services.account_service import create_account

        account = await create_account(
            db, user_id, account_type, currency=account_currency, initial_balance=starting_balance
        )
    return account


async def get_asset_and_price(db: AsyncSession, symbol: str) -> tuple[Asset, MarketPrice]:
    asset_result = await db.execute(select(Asset).where(Asset.symbol == symbol.upper()))
    asset = asset_result.scalar_one_or_none()
    if asset is None:
        raise TradingError(f"Unknown asset symbol: {symbol}")

    price_result = await db.execute(select(MarketPrice).where(MarketPrice.asset_id == asset.id))
    market_price = price_result.scalar_one_or_none()
    if market_price is None:
        raise TradingError(f"No market price available for {symbol}")
    return asset, market_price


def _limit_condition_met(order_type: OrderType, side: OrderSide, limit_price: Decimal, stop_price: Decimal | None, current_price: Decimal) -> bool:
    if order_type == OrderType.LIMIT:
        return current_price <= limit_price if side == OrderSide.BUY else current_price >= limit_price
    if order_type == OrderType.STOP_LIMIT:
        stop_triggered = current_price <= stop_price if side == OrderSide.BUY else current_price >= stop_price
        return stop_triggered
    return True


async def place_order(db: AsyncSession, user: User, payload: OrderCreate) -> tuple[Order, Trade | None, Position | None]:
    from app.services.account_service import resolve_account as _resolve_account

    asset, market_price = await get_asset_and_price(db, payload.symbol)
    current_price = market_price.current_price

    # Resolve the account before the order row is written, not after it is
    # filled. The row names an account, and it used to take `payload.account_id`
    # unchecked: an id belonging to somebody else satisfies the foreign key, so
    # a limit order that did not fill immediately was committed pointing at
    # another user's account, and an id that did not exist at all surfaced as a
    # foreign-key 500 rather than a 404.
    target = await _resolve_account(
        db, user.id, account_id=payload.account_id, account_type=payload.account_type
    )

    order = Order(
        user_id=user.id,
        symbol=asset.symbol,
        side=payload.side,
        order_type=payload.order_type,
        quantity=payload.quantity,
        account_type=payload.account_type,
        account_id=target.id,
        price=payload.price,
        stop_price=payload.stop_price,
        take_profit_price=payload.take_profit_price,
        stop_loss_price=payload.stop_loss_price,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    await db.flush()

    should_fill = True
    if payload.order_type != OrderType.MARKET:
        should_fill = _limit_condition_met(payload.order_type, payload.side, payload.price, payload.stop_price, current_price)

    if not should_fill:
        order.status = OrderStatus.OPEN
        await db.commit()
        await publish_to_user(user.id, WSEvent.ORDER_UPDATED, _order_payload(order))
        return order, None, None

    trade, position = await _fill_order(db, user, asset, order, current_price)
    return order, trade, position


async def _fill_order(db: AsyncSession, user: User, asset: Asset, order: Order, fill_price: Decimal) -> tuple[Trade, Position | None]:
    from app.services.account_service import recompute_margin

    # The specific account the order names. Falls back to the primary account
    # of its type, so callers that predate multi-account still work.
    from app.services.account_service import resolve_account

    account = await resolve_account(
        db, user.id, account_id=order.account_id, account_type=order.account_type
    )

    # Everything below is a read-check-write on the same account: free margin
    # is computed, the order is judged against it, then balances are written.
    # Run concurrently that check is worthless — five simultaneous orders each
    # saw the full balance and all five opened, reserving five times the margin
    # the account could cover.
    #
    # Serialised with an advisory lock rather than SELECT ... FOR UPDATE. A row
    # lock here deadlocks against the background market engine, which updates
    # these same rows for stop-outs and equity snapshots; the engine never
    # takes this advisory lock, so orders queue behind each other without ever
    # forming a cycle with it. The lock is transaction-scoped and released on
    # commit or rollback.
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"account-order:{account.id}"},
    )
    # Re-read under the lock: the values loaded above may predate a concurrent
    # order that has since committed.
    await db.refresh(account)

    if order.side == OrderSide.BUY:
        trade, position = await _execute_buy(db, user, asset, order, account, fill_price)
    else:
        trade, position = await _execute_sell(db, user, asset, order, account, fill_price)

    order.status = OrderStatus.FILLED
    order.filled_price = fill_price
    await recompute_margin(db, account)
    await db.commit()

    await publish_to_user(user.id, WSEvent.ORDER_UPDATED, _order_payload(order))
    await publish_to_user(user.id, WSEvent.TRADE_EXECUTED, _trade_payload(trade))
    if position is not None:
        await publish_to_user(user.id, WSEvent.POSITION_UPDATED, _position_payload(position))
    await publish_to_user(user.id, WSEvent.ACCOUNT_BALANCE_UPDATED, {
        "available_balance": str(account.available_balance),
        "locked_balance": str(account.locked_balance),
        "currency": account.currency,
    })
    await publish_to_user(user.id, WSEvent.PORTFOLIO_UPDATED, {"reason": "trade_executed"})

    return trade, position


async def _execute_buy(db, user, asset, order: Order, account: Account, fill_price: Decimal) -> tuple[Trade, Position]:
    from app.services.account_service import account_metrics, recompute_margin, required_margin

    notional = (fill_price * order.quantity).quantize(Decimal("0.01"))
    # What the trade actually ties up. At 1:1 this equals the notional, which
    # is how the platform behaved before leverage existed.
    margin = required_margin(notional, account.leverage)
    total_cost = margin

    metrics = await account_metrics(db, account)
    if metrics["free_margin"] < margin:
        order.status = OrderStatus.REJECTED
        await db.commit()
        raise TradingError(
            f"Insufficient free margin. This order needs {margin} "
            f"{account.currency} at 1:{account.leverage}; {metrics['free_margin']} is available."
        )

    # Scoped to the order's book: without this a real-account buy would merge
    # into an open demo position in the same symbol.
    result = await db.execute(
        select(Position).where(
            Position.user_id == user.id,
            Position.symbol == asset.symbol,
            Position.account_type == order.account_type,
            Position.status == PositionStatus.OPEN,
        )
    )
    position = result.scalar_one_or_none()

    if position is None:
        position = Position(
            user_id=user.id,
            asset_id=asset.id,
            symbol=asset.symbol,
            account_type=order.account_type,
            quantity=order.quantity,
            average_entry_price=fill_price,
            total_cost_basis=total_cost,
            current_market_price=fill_price,
            current_market_value=total_cost,
            unrealized_profit_loss=0,
            unrealized_profit_loss_pct=0,
            account_id=account.id,
            margin_reserved=margin,
            leverage=account.leverage,
            take_profit_price=order.take_profit_price,
            stop_loss_price=order.stop_loss_price,
            status=PositionStatus.OPEN,
            opened_at=datetime.now(timezone.utc),
        )
        db.add(position)
    else:
        new_quantity = position.quantity + order.quantity
        new_cost_basis = position.total_cost_basis + total_cost
        position.quantity = new_quantity
        position.total_cost_basis = new_cost_basis
        position.average_entry_price = (new_cost_basis / new_quantity).quantize(Decimal("0.00000001"))
        position.current_market_price = fill_price
        position.current_market_value = (new_quantity * fill_price).quantize(Decimal("0.01"))
        position.unrealized_profit_loss = position.current_market_value - new_cost_basis
        position.unrealized_profit_loss_pct = (
            (position.unrealized_profit_loss / new_cost_basis * 100) if new_cost_basis else Decimal(0)
        )
        # An add-on order may revise the brackets, but omitting them means
        # "leave as they are" rather than "remove the protection".
        position.margin_reserved = (position.margin_reserved or Decimal(0)) + margin
        if order.take_profit_price is not None:
            position.take_profit_price = order.take_profit_price
        if order.stop_loss_price is not None:
            position.stop_loss_price = order.stop_loss_price

    await db.flush()

    trade = Trade(
        user_id=user.id, order_id=order.id, position_id=position.id, symbol=asset.symbol,
        side=OrderSide.BUY, quantity=order.quantity, execution_price=fill_price, total_value=total_cost,
    )
    db.add(trade)

    await apply_ledger_transaction(
        db, account, TransactionType.TRADE_BUY, -total_cost,
        reference_type="order", reference_id=order.id,
        description=f"Buy {order.quantity} {asset.symbol} @ {fill_price}",
    )
    await db.flush()
    return trade, position


async def _execute_sell(db, user, asset, order: Order, account: Account, fill_price: Decimal) -> tuple[Trade, Position]:
    result = await db.execute(
        select(Position).where(
            Position.user_id == user.id,
            Position.symbol == asset.symbol,
            Position.account_type == order.account_type,
            Position.status == PositionStatus.OPEN,
        )
    )
    position = result.scalar_one_or_none()
    if position is None or position.quantity < order.quantity:
        order.status = OrderStatus.REJECTED
        await db.commit()
        raise TradingError("Insufficient position quantity to sell.")

    proceeds = (fill_price * order.quantity).quantize(Decimal("0.01"))
    cost_removed = (position.average_entry_price * order.quantity).quantize(Decimal("0.01"))
    realized_pl = proceeds - cost_removed

    position.quantity -= order.quantity
    position.total_cost_basis -= cost_removed
    position.realized_profit_loss = (position.realized_profit_loss or Decimal(0)) + realized_pl

    if position.quantity <= 0:
        position.status = PositionStatus.CLOSED
        position.closed_at = datetime.now(timezone.utc)
        position.closing_price = fill_price
        position.current_market_value = 0
        position.unrealized_profit_loss = 0
        position.unrealized_profit_loss_pct = 0
    else:
        position.current_market_price = fill_price
        position.current_market_value = (position.quantity * fill_price).quantize(Decimal("0.01"))
        position.unrealized_profit_loss = position.current_market_value - position.total_cost_basis
        position.unrealized_profit_loss_pct = (
            (position.unrealized_profit_loss / position.total_cost_basis * 100) if position.total_cost_basis else Decimal(0)
        )

    await db.flush()

    trade = Trade(
        user_id=user.id, order_id=order.id, position_id=position.id, symbol=asset.symbol,
        side=OrderSide.SELL, quantity=order.quantity, execution_price=fill_price, total_value=proceeds,
        realized_profit_loss=realized_pl,
    )
    db.add(trade)

    await apply_ledger_transaction(
        db, account, TransactionType.TRADE_SELL, proceeds,
        reference_type="order", reference_id=order.id,
        description=f"Sell {order.quantity} {asset.symbol} @ {fill_price}",
    )
    await db.flush()
    return trade, position


async def close_position_at_market(db: AsyncSession, user: User, position_id: uuid.UUID) -> Position:
    position = await db.get(Position, position_id)
    if position is None or position.user_id != user.id:
        raise TradingError("Position not found.")
    if position.status != PositionStatus.OPEN:
        raise TradingError("Position is already closed.")

    asset_result = await db.execute(select(Asset).where(Asset.symbol == position.symbol))
    asset = asset_result.scalar_one()
    # Credit the proceeds back to the exact account the position belongs to.
    from app.services.account_service import resolve_account

    account = await resolve_account(
        db, user.id, account_id=position.account_id, account_type=position.account_type
    )

    fill_price = position.current_market_price
    quantity = position.quantity
    proceeds = (fill_price * quantity).quantize(Decimal("0.01"))
    realized_pl = proceeds - position.total_cost_basis

    order = Order(
        user_id=user.id, symbol=position.symbol, side=OrderSide.SELL, order_type=OrderType.MARKET,
        quantity=quantity, filled_price=fill_price, status=OrderStatus.FILLED,
    )
    db.add(order)
    await db.flush()

    trade = Trade(
        user_id=user.id, order_id=order.id, position_id=position.id, symbol=position.symbol,
        side=OrderSide.SELL, quantity=quantity, execution_price=fill_price, total_value=proceeds,
        realized_profit_loss=realized_pl,
    )
    db.add(trade)

    position.status = PositionStatus.CLOSED
    position.closed_at = datetime.now(timezone.utc)
    position.closing_price = fill_price
    # Margin comes back the moment the position is no longer open. Recomputed
    # from the remaining book rather than subtracted, so it cannot drift.
    position.margin_reserved = Decimal(0)
    position.realized_profit_loss = (position.realized_profit_loss or Decimal(0)) + realized_pl
    position.current_market_value = proceeds
    position.unrealized_profit_loss = 0
    position.unrealized_profit_loss_pct = 0

    await apply_ledger_transaction(
        db, account, TransactionType.POSITION_CLOSE, proceeds,
        reference_type="position", reference_id=position.id,
        description=f"Close {quantity} {position.symbol} @ {fill_price}",
    )

    await db.commit()

    from app.services.account_service import recompute_margin as _recompute

    await _recompute(db, account)
    await db.commit()
    await publish_to_user(user.id, WSEvent.POSITION_CLOSED, _position_payload(position))
    await publish_to_user(user.id, WSEvent.TRADE_EXECUTED, _trade_payload(trade))
    await publish_to_user(user.id, WSEvent.ACCOUNT_BALANCE_UPDATED, {
        "available_balance": str(account.available_balance),
        "locked_balance": str(account.locked_balance),
        "currency": account.currency,
    })
    await publish_to_user(user.id, WSEvent.PORTFOLIO_UPDATED, {"reason": "position_closed"})
    return position


async def cancel_order(db: AsyncSession, user: User, order_id: uuid.UUID) -> Order:
    order = await db.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise TradingError("Order not found.")
    if order.status not in (OrderStatus.PENDING, OrderStatus.OPEN):
        raise TradingError("Only pending or open orders can be cancelled.")
    order.status = OrderStatus.CANCELLED
    await db.commit()
    await publish_to_user(user.id, WSEvent.ORDER_UPDATED, _order_payload(order))
    return order


def _order_payload(order: Order) -> dict:
    return {
        "id": str(order.id), "symbol": order.symbol, "side": order.side.value,
        "order_type": order.order_type.value, "quantity": str(order.quantity),
        "price": str(order.price) if order.price else None,
        "filled_price": str(order.filled_price) if order.filled_price else None,
        "take_profit_price": str(order.take_profit_price) if order.take_profit_price else None,
        "stop_loss_price": str(order.stop_loss_price) if order.stop_loss_price else None,
        "status": order.status.value,
    }


def _trade_payload(trade: Trade) -> dict:
    return {
        "id": str(trade.id), "order_id": str(trade.order_id), "symbol": trade.symbol,
        "side": trade.side.value, "quantity": str(trade.quantity),
        "execution_price": str(trade.execution_price), "total_value": str(trade.total_value),
        "realized_profit_loss": str(trade.realized_profit_loss) if trade.realized_profit_loss is not None else None,
    }


def _position_payload(position: Position) -> dict:
    return {
        "id": str(position.id), "symbol": position.symbol, "quantity": str(position.quantity),
        "average_entry_price": str(position.average_entry_price),
        "current_market_price": str(position.current_market_price),
        "current_market_value": str(position.current_market_value),
        "unrealized_profit_loss": str(position.unrealized_profit_loss),
        "unrealized_profit_loss_pct": str(position.unrealized_profit_loss_pct),
        "take_profit_price": str(position.take_profit_price) if position.take_profit_price else None,
        "stop_loss_price": str(position.stop_loss_price) if position.stop_loss_price else None,
        # The close fields are what let a client mark a row closed in place
        # instead of silently dropping it from the table.
        "status": position.status.value,
        "opened_at": position.opened_at.isoformat() if position.opened_at else None,
        "closed_at": position.closed_at.isoformat() if position.closed_at else None,
        "closing_price": str(position.closing_price) if position.closing_price is not None else None,
        "realized_profit_loss": str(position.realized_profit_loss) if position.realized_profit_loss is not None else None,
    }
