"""Admin-side financial management: user roll-ups, controlled balance
adjustments (ledger-backed, never a raw balance overwrite), and the
admin-managed position / account-override layer. Every mutating action in
this module writes an audit log entry.
"""
import uuid
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.admin_adjustment import AdminAdjustment
from app.models.admin_position import AdminPosition
from app.models.enums import (
    AdjustmentType,
    AuditActorType,
    OrderStatus,
    PositionStatus,
    TransactionType,
)
from app.models.order import Order
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.models.user_financial_settings import UserFinancialSettings
from app.schemas.admin import AdminPositionCreate, AdminPositionUpdate, AdminUserRow, BalanceAdjustmentRequest, UserFinancialSettingsUpdate
from app.services.audit_service import record_audit
from app.services.ledger_service import apply_ledger_transaction
from app.services.trading_service import get_or_create_account
from app.websocket.events import WSEvent
from app.websocket.publisher import publish_to_user


async def list_users_with_financials(db: AsyncSession, search: str | None, page: int, page_size: int) -> tuple[list[AdminUserRow], int]:
    query = select(User)
    if search:
        like = f"%{search}%"
        query = query.where((User.email.ilike(like)) | (User.full_name.ilike(like)) | (User.username.ilike(like)))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(query)).scalars().all()

    rows = [await build_admin_user_row(db, user) for user in users]
    return rows, total


async def build_admin_user_row(db: AsyncSession, user: User) -> AdminUserRow:
    account = await get_or_create_account(db, user.id, "demo", currency="USD")

    unrealized = (await db.execute(
        select(func.coalesce(func.sum(Position.unrealized_profit_loss), 0)).where(
            Position.user_id == user.id, Position.status == PositionStatus.OPEN
        )
    )).scalar_one()

    realized = (await db.execute(
        select(func.coalesce(func.sum(Trade.realized_profit_loss), 0)).where(Trade.user_id == user.id)
    )).scalar_one()

    volume = (await db.execute(
        select(func.coalesce(func.sum(Trade.total_value), 0)).where(Trade.user_id == user.id)
    )).scalar_one()

    open_positions_count = (await db.execute(
        select(func.count()).where(Position.user_id == user.id, Position.status == PositionStatus.OPEN)
    )).scalar_one()

    open_orders_count = (await db.execute(
        select(func.count()).where(Order.user_id == user.id, Order.status.in_([OrderStatus.PENDING, OrderStatus.OPEN]))
    )).scalar_one()

    deposits = (await db.execute(
        select(func.coalesce(func.sum(AdminAdjustment.amount), 0)).where(
            AdminAdjustment.user_id == user.id, AdminAdjustment.adjustment_type == AdjustmentType.CREDIT
        )
    )).scalar_one()
    withdrawals = (await db.execute(
        select(func.coalesce(func.sum(AdminAdjustment.amount), 0)).where(
            AdminAdjustment.user_id == user.id, AdminAdjustment.adjustment_type == AdjustmentType.DEBIT
        )
    )).scalar_one()

    return AdminUserRow(
        id=user.id, display_id=user.display_id, full_name=user.full_name, email=user.email, username=user.username,
        status=user.status, is_verified=user.is_verified, created_at=user.created_at,
        last_login_at=user.last_login_at,
        available_balance=account.available_balance, locked_balance=account.locked_balance,
        total_account_value=account.available_balance + account.locked_balance + Decimal(unrealized or 0),
        total_deposits=Decimal(deposits or 0), total_withdrawals=Decimal(withdrawals or 0),
        total_realized_pnl=Decimal(realized or 0), total_unrealized_pnl=Decimal(unrealized or 0),
        total_trading_volume=Decimal(volume or 0),
        open_positions_count=open_positions_count, open_orders_count=open_orders_count,
        currency=account.currency, risk_status=user.risk_status,
    )


class AdminActionError(Exception):
    pass


async def adjust_user_balance(
    db: AsyncSession, admin: User, user_id: uuid.UUID, payload: BalanceAdjustmentRequest, ip_address: str | None
) -> AdminAdjustment:
    target_user = await db.get(User, user_id)
    if target_user is None:
        raise AdminActionError("User not found.")

    # Admin adjustments always go to REAL account, not DEMO
    account = await get_or_create_account(db, user_id, "real")
    delta = payload.amount if payload.adjustment_type == AdjustmentType.CREDIT else -payload.amount
    transaction_type = TransactionType.ADMIN_CREDIT if payload.adjustment_type == AdjustmentType.CREDIT else TransactionType.ADMIN_DEBIT

    ledger_entry = await apply_ledger_transaction(
        db, account, transaction_type, delta,
        reference_type="admin_adjustment", description=payload.reason,
    )

    adjustment = AdminAdjustment(
        admin_id=admin.id, user_id=user_id, transaction_id=ledger_entry.id,
        adjustment_type=payload.adjustment_type, amount=payload.amount, currency=payload.currency,
        reason=payload.reason, internal_reference=payload.internal_reference, notes=payload.notes,
    )
    db.add(adjustment)

    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="BALANCE_ADJUSTMENT",
        resource_type="account", resource_id=account.id,
        previous_data={"balance": str(ledger_entry.balance_before)},
        new_data={"balance": str(ledger_entry.balance_after)},
        reason=payload.reason, ip_address=ip_address,
    )
    await db.commit()

    await publish_to_user(user_id, WSEvent.ADMIN_ACCOUNT_ADJUSTED, {
        "adjustment_type": payload.adjustment_type.value, "amount": str(payload.amount),
        "balance_after": str(ledger_entry.balance_after), "reason": payload.reason,
    })
    await publish_to_user(user_id, WSEvent.ACCOUNT_BALANCE_UPDATED, {
        "available_balance": str(account.available_balance), "locked_balance": str(account.locked_balance),
        "currency": account.currency,
    })
    await publish_to_user(user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "admin_adjustment"})
    return adjustment


async def create_admin_position(db: AsyncSession, admin: User, payload: AdminPositionCreate, ip_address: str | None) -> AdminPosition:
    position = AdminPosition(
        user_id=payload.user_id, asset_name=payload.asset_name, symbol=payload.symbol.upper(),
        quantity=payload.quantity, entry_price=payload.entry_price, admin_current_price=payload.admin_current_price,
        invested_amount=payload.invested_amount, admin_current_value=payload.admin_current_value,
        admin_profit_loss=payload.admin_profit_loss, admin_profit_loss_pct=payload.admin_profit_loss_pct,
        position_status=payload.position_status, created_by_admin_id=admin.id,
    )
    db.add(position)
    await db.flush()

    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="ADMIN_POSITION_CREATED",
        resource_type="admin_position", resource_id=position.id, new_data={"symbol": position.symbol}, ip_address=ip_address,
    )
    await db.commit()
    await db.refresh(position)

    await publish_to_user(payload.user_id, WSEvent.ADMIN_POSITION_UPDATED, {"id": str(position.id), "symbol": position.symbol})
    await publish_to_user(payload.user_id, WSEvent.ADMIN_PORTFOLIO_UPDATED, {"reason": "admin_position_created"})
    await publish_to_user(payload.user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "admin_position_created"})
    return position


async def update_admin_position(db: AsyncSession, admin: User, position_id: uuid.UUID, payload: AdminPositionUpdate, ip_address: str | None) -> AdminPosition:
    position = await db.get(AdminPosition, position_id)
    if position is None:
        raise AdminActionError("Position not found.")

    previous = {"admin_current_price": str(position.admin_current_price), "position_status": position.position_status.value}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(position, field, value)
    position.updated_by_admin_id = admin.id
    await db.flush()

    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="ADMIN_POSITION_UPDATED",
        resource_type="admin_position", resource_id=position.id,
        previous_data=previous, new_data=payload.model_dump(exclude_unset=True, mode="json"), ip_address=ip_address,
    )
    await db.commit()
    await db.refresh(position)

    await publish_to_user(position.user_id, WSEvent.ADMIN_POSITION_UPDATED, {"id": str(position.id), "symbol": position.symbol})
    await publish_to_user(position.user_id, WSEvent.ADMIN_PORTFOLIO_UPDATED, {"reason": "admin_position_updated"})
    await publish_to_user(position.user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "admin_position_updated"})
    return position


async def delete_admin_position(db: AsyncSession, admin: User, position_id: uuid.UUID, ip_address: str | None) -> None:
    position = await db.get(AdminPosition, position_id)
    if position is None:
        raise AdminActionError("Position not found.")
    user_id = position.user_id
    await db.delete(position)
    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="ADMIN_POSITION_DELETED",
        resource_type="admin_position", resource_id=position_id, ip_address=ip_address,
    )
    await db.commit()
    await publish_to_user(user_id, WSEvent.ADMIN_PORTFOLIO_UPDATED, {"reason": "admin_position_deleted"})
    await publish_to_user(user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "admin_position_deleted"})


async def upsert_user_financial_settings(
    db: AsyncSession, admin: User, user_id: uuid.UUID, payload: UserFinancialSettingsUpdate, ip_address: str | None
) -> UserFinancialSettings:
    result = await db.execute(select(UserFinancialSettings).where(UserFinancialSettings.user_id == user_id))
    settings_row = result.scalar_one_or_none()
    previous = None
    if settings_row is None:
        settings_row = UserFinancialSettings(user_id=user_id, **payload.model_dump())
        db.add(settings_row)
    else:
        previous = {"is_active": settings_row.is_active, "portfolio_value": str(settings_row.portfolio_value)}
        for field, value in payload.model_dump().items():
            setattr(settings_row, field, value)
    settings_row.updated_by_admin_id = admin.id
    await db.flush()

    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="USER_FINANCIAL_SETTINGS_UPDATED",
        resource_type="user_financial_settings", resource_id=settings_row.id,
        previous_data=previous, new_data=payload.model_dump(mode="json"), ip_address=ip_address,
    )
    await db.commit()
    await db.refresh(settings_row)

    await publish_to_user(user_id, WSEvent.ADMIN_ACCOUNT_UPDATED, {"portfolio_value": str(settings_row.portfolio_value)})
    await publish_to_user(user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "admin_financial_settings_updated"})
    return settings_row


#: Rows owned by the user, cleared before the user itself. Every foreign key
#: into `users`/`accounts` is NO ACTION, so Postgres refuses to delete a user
#: while any child row survives — and `trades` point at orders and positions,
#: so they have to go before those do.
_DELETE_BY_ACCOUNT = ("equity_snapshots", "transaction_ledger", "deposits", "withdrawals", "orders", "positions")
_DELETE_BY_USER = (
    ("transaction_ledger", "user_id"),
    ("deposits", "user_id"),
    ("withdrawals", "user_id"),
    ("orders", "user_id"),
    ("positions", "user_id"),
    ("admin_adjustments", "user_id"),
    ("admin_positions", "user_id"),
    ("user_financial_settings", "user_id"),
    ("notifications", "user_id"),
    ("watchlist_items", "user_id"),
    ("login_history", "user_id"),
    ("user_sessions", "user_id"),
)

#: Columns naming the admin who *acted* on a row that belongs to someone else.
#: These are blanked, never deleted — the row is another user's financial
#: history and deleting it to remove an administrator would be destroying
#: records that have nothing to do with them.
_NULL_ADMIN_REFS = (
    ("withdrawals", "reviewed_by"),
    ("deposits", "admin_confirmed_by"),
    ("user_financial_settings", "updated_by_admin_id"),
    ("admin_positions", "updated_by_admin_id"),
)

#: The same relationship where the column is NOT NULL, so it cannot be blanked.
#: Rather than delete another user's balance-adjustment history to make room,
#: deletion is refused and the admin is told to deactivate instead.
_BLOCKING_ADMIN_REFS = (
    ("admin_adjustments", "admin_id", "balance adjustments"),
    ("admin_positions", "created_by_admin_id", "admin-managed positions"),
)


async def delete_user(db: AsyncSession, admin: User, user: User, reason: str, ip_address: str | None) -> dict:
    """Permanently delete a user and everything belonging to them.

    Irreversible, and unlike suspending or banning it leaves no account behind
    to reinstate. The audit entry is written first and outlives the user: its
    `resource_id` is a plain column, not a foreign key, so the record of who
    deleted whom survives the row it describes.
    """
    for table, column, label in _BLOCKING_ADMIN_REFS:
        count = (await db.execute(
            text(f"select count(*) from {table} where {column} = :uid"), {"uid": user.id}
        )).scalar() or 0
        if count:
            raise AdminActionError(
                f"This administrator recorded {count} {label} against other users. "
                "Deleting them would delete those records too, so the account can only be deactivated."
            )

    await record_audit(
        db, actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="USER_DELETED",
        resource_type="user", resource_id=user.id,
        previous_data={"email": user.email, "username": user.username, "role": user.role.value},
        reason=reason, ip_address=ip_address,
    )

    for table, column in _NULL_ADMIN_REFS:
        await db.execute(text(f"update {table} set {column} = null where {column} = :uid"), {"uid": user.id})

    deleted: dict[str, int] = {}

    def _tally(table: str, rowcount: int | None) -> None:
        if rowcount:
            deleted[table] = deleted.get(table, 0) + rowcount

    # Trades first: they reference the orders and positions cleared below.
    _tally("trades", (await db.execute(text("delete from trades where user_id = :uid"), {"uid": user.id})).rowcount)

    account_ids = (await db.execute(select(Account.id).where(Account.user_id == user.id))).scalars().all()
    if account_ids:
        for table in _DELETE_BY_ACCOUNT:
            _tally(table, (await db.execute(
                text(f"delete from {table} where account_id = any(:ids)"), {"ids": list(account_ids)}
            )).rowcount)

    for table, column in _DELETE_BY_USER:
        _tally(table, (await db.execute(
            text(f"delete from {table} where {column} = :uid"), {"uid": user.id}
        )).rowcount)

    _tally("accounts", (await db.execute(text("delete from accounts where user_id = :uid"), {"uid": user.id})).rowcount)
    _tally("users", (await db.execute(text("delete from users where id = :uid"), {"uid": user.id})).rowcount)

    await db.commit()
    return deleted
