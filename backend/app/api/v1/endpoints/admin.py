import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.schemas.account import AccountOut, AdminBonusUpdate, AdminLeverageUpdate
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_client_ip, get_current_admin
from app.database.session import get_db
from app.models.admin_position import AdminPosition
from app.models.audit_log import AuditLog
from app.models.enums import OrderStatus, PositionStatus, UserStatus
from app.models.order import Order
from app.models.position import Position
from app.models.trade import Trade
from app.models.transaction_ledger import TransactionLedger
from app.models.user import User
from app.schemas.admin import (
    AdminDashboardStats,
    AdminPositionCreate,
    AdminPositionOut,
    AdminPositionUpdate,
    AdminUserFinancialProfile,
    AdminUserRow,
    AuditLogOut,
    BalanceAdjustmentRequest,
    UserFinancialSettingsOut,
    UserFinancialSettingsUpdate,
)
from app.schemas.common import Page
from app.schemas.trading import OrderOut, PositionOut, TradeOut
from app.schemas.wallet import LedgerEntryOut
from app.services import admin_service
from app.services.admin_trading_service import (
    AdminTradingError,
    admin_force_loss,
    admin_force_profit,
    admin_set_position_price,
)
from app.services.trading_service import get_or_create_account

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/stats", response_model=AdminDashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (await db.execute(select(func.count()).where(User.status == UserStatus.ACTIVE))).scalar_one()
    volume = (await db.execute(select(func.coalesce(func.sum(Trade.total_value), 0)))).scalar_one()
    open_orders = (await db.execute(select(func.count()).where(Order.status.in_([OrderStatus.PENDING, OrderStatus.OPEN])))).scalar_one()

    recent_users = (await db.execute(select(User).order_by(User.created_at.desc()).limit(10))).scalars().all()
    recent_trades = (await db.execute(select(Trade).order_by(Trade.executed_at.desc()).limit(10))).scalars().all()

    return AdminDashboardStats(
        total_users=total_users, active_users=active_users,
        total_simulated_trading_volume=volume, open_orders_count=open_orders,
        recent_registrations=[{"id": str(u.id), "full_name": u.full_name, "email": u.email, "created_at": u.created_at.isoformat()} for u in recent_users],
        recent_trades=[{"id": str(t.id), "symbol": t.symbol, "side": t.side.value, "total_value": str(t.total_value), "executed_at": t.executed_at.isoformat()} for t in recent_trades],
    )


@router.get("/users", response_model=Page[AdminUserRow])
async def list_users(
    search: str | None = Query(default=None), page: int = Query(default=1, ge=1), page_size: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    rows, total = await admin_service.list_users_with_financials(db, search, page, page_size)
    return Page(items=rows, total=total, page=page, page_size=page_size, total_pages=max(1, -(-total // page_size)))


@router.get("/users/{user_id}", response_model=AdminUserRow)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found."}})
    return await admin_service.build_admin_user_row(db, user)


class UpdateUserStatusRequest(BaseModel):
    status: UserStatus
    #: Why the change was made. Required for any status that denies access —
    #: a block with no recorded reason is not reviewable later.
    reason: str | None = Field(default=None, max_length=500)


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    payload: UpdateUserStatusRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend, deactivate, ban or reinstate a user.

    Blocking states take effect immediately: `get_current_user` rejects every
    authenticated request from a blocked account, and the user's sessions are
    revoked here so an already-issued token cannot outlive the decision."""
    from app.core.deps import get_client_ip
    from app.models.audit_log import AuditLog
    from app.models.enums import AuditActorType, BLOCKED_USER_STATUSES, UserRole
    from app.models.user_session import UserSession

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found."}})

    is_blocking = payload.status in BLOCKED_USER_STATUSES

    # An admin locking themselves out cannot undo it from the same console.
    if user.id == admin.id and is_blocking:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "CANNOT_BLOCK_SELF", "message": "You cannot suspend, deactivate or ban your own account."}},
        )

    # Only a super admin can act on another admin, so an ordinary admin cannot
    # disable their own oversight.
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN) and admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "REQUIRES_SUPER_ADMIN", "message": "Only a super admin can change another administrator's status."}},
        )

    if is_blocking and not (payload.reason or "").strip():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "REASON_REQUIRED", "message": "A reason is required when suspending, deactivating or banning an account."}},
        )

    old_status = user.status
    user.status = payload.status

    # Kill live sessions on the way out. The per-request status check already
    # denies them, but leaving rows marked active misreports who is signed in.
    revoked = 0
    if is_blocking:
        sessions = (await db.execute(
            select(UserSession).where(UserSession.user_id == user.id, UserSession.is_active == True)  # noqa: E712
        )).scalars().all()
        for session in sessions:
            session.is_active = False
        revoked = len(sessions)

    db.add(AuditLog(
        actor_id=admin.id,
        actor_type=AuditActorType.ADMIN,
        action="USER_STATUS_UPDATED",
        resource_type="user",
        resource_id=user.id,
        previous_data={"status": old_status.value},
        new_data={"status": payload.status.value, "sessions_revoked": revoked},
        reason=payload.reason,
        ip_address=get_client_ip(request),
    ))

    await db.commit()
    await db.refresh(user)

    return {"success": True, "status": user.status.value, "sessions_revoked": revoked}


class UpdateUserVerificationRequest(BaseModel):
    is_verified: bool


@router.patch("/users/{user_id}/verification")
async def update_user_verification(
    user_id: uuid.UUID,
    payload: UpdateUserVerificationRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found."}})

    from app.models.audit_log import AuditLog
    from app.models.enums import AuditActorType
    from app.core.deps import get_client_ip

    old_verified = user.is_verified
    user.is_verified = payload.is_verified

    # Create audit log
    audit = AuditLog(
        actor_id=admin.id,
        actor_type=AuditActorType.ADMIN,
        action="USER_VERIFICATION_UPDATED",
        resource_type="user",
        resource_id=user.id,
        previous_data={"is_verified": old_verified},
        new_data={"is_verified": payload.is_verified},
        ip_address=get_client_ip(request),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)

    return {"success": True, "is_verified": user.is_verified}


@router.get("/users/{user_id}/financial-profile", response_model=AdminUserFinancialProfile)
async def get_financial_profile(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found."}})

    row = await admin_service.build_admin_user_row(db, user)

    orders = (await db.execute(select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc()).limit(20))).scalars().all()
    open_orders = [o for o in orders if o.status in (OrderStatus.PENDING, OrderStatus.OPEN)]
    trades = (await db.execute(select(Trade).where(Trade.user_id == user_id).order_by(Trade.executed_at.desc()).limit(50))).scalars().all()
    positions = (await db.execute(select(Position).where(Position.user_id == user_id).order_by(Position.opened_at.desc()).limit(50))).scalars().all()
    ledger = (await db.execute(select(TransactionLedger).where(TransactionLedger.user_id == user_id).order_by(TransactionLedger.created_at.desc()).limit(50))).scalars().all()

    def d(o): return {k: (str(v) if hasattr(v, "quantize") else (v.isoformat() if hasattr(v, "isoformat") else (v.value if hasattr(v, "value") else str(v)))) for k, v in {
        "id": o.id, **{c.name: getattr(o, c.name) for c in o.__table__.columns if c.name != "id"}
    }.items()}

    return AdminUserFinancialProfile(
        user=row,
        recent_orders=[d(o) for o in orders],
        open_orders=[d(o) for o in open_orders],
        trade_history=[d(t) for t in trades],
        position_history=[d(p) for p in positions],
        ledger_entries=[d(l) for l in ledger],
        login_history=[],
        active_sessions=[],
    )


@router.post("/users/{user_id}/balance-adjustments", status_code=status.HTTP_201_CREATED)
async def create_balance_adjustment(
    user_id: uuid.UUID, payload: BalanceAdjustmentRequest, request: Request,
    admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db),
):
    try:
        adjustment = await admin_service.adjust_user_balance(db, admin, user_id, payload, get_client_ip(request))
    except admin_service.AdminActionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "ADJUSTMENT_FAILED", "message": str(exc)}})
    return {"id": str(adjustment.id), "transaction_id": str(adjustment.transaction_id)}


@router.get("/users/{user_id}/transactions", response_model=list[LedgerEntryOut])
async def get_user_transactions(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(TransactionLedger).where(TransactionLedger.user_id == user_id).order_by(TransactionLedger.created_at.desc())
    return (await db.execute(query)).scalars().all()


@router.get("/users/{user_id}/positions", response_model=list[PositionOut])
async def get_user_positions(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(Position).where(Position.user_id == user_id).order_by(Position.opened_at.desc())
    return (await db.execute(query)).scalars().all()


@router.get("/users/{user_id}/orders", response_model=list[OrderOut])
async def get_user_orders(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    return (await db.execute(query)).scalars().all()


# --- Admin-managed positions (manual override layer) -----------------------

@router.get("/positions", response_model=list[AdminPositionOut])
async def list_admin_positions(db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(AdminPosition).order_by(AdminPosition.updated_at.desc()))).scalars().all()


@router.post("/positions", response_model=AdminPositionOut, status_code=status.HTTP_201_CREATED)
async def create_admin_position(payload: AdminPositionCreate, request: Request, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    return await admin_service.create_admin_position(db, admin, payload, get_client_ip(request))


@router.patch("/positions/{position_id}", response_model=AdminPositionOut)
async def update_admin_position(position_id: uuid.UUID, payload: AdminPositionUpdate, request: Request, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    try:
        return await admin_service.update_admin_position(db, admin, position_id, payload, get_client_ip(request))
    except admin_service.AdminActionError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "POSITION_NOT_FOUND", "message": str(exc)}})


@router.delete("/positions/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_position(position_id: uuid.UUID, request: Request, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    try:
        await admin_service.delete_admin_position(db, admin, position_id, get_client_ip(request))
    except admin_service.AdminActionError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "POSITION_NOT_FOUND", "message": str(exc)}})


# --- Admin-managed account overrides ---------------------------------------

@router.put("/users/{user_id}/financial-settings", response_model=UserFinancialSettingsOut)
async def set_financial_settings(
    user_id: uuid.UUID, payload: UserFinancialSettingsUpdate, request: Request,
    admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db),
):
    return await admin_service.upsert_user_financial_settings(db, admin, user_id, payload, get_client_ip(request))


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)
    return (await db.execute(query)).scalars().all()


# --- Admin Live Trading Position Manipulation -----------------------------------

class PositionManipulationRequest(BaseModel):
    """Request schema for position manipulation."""
    amount: Decimal = Field(gt=0, description="Amount of profit or loss to apply")
    reason: str | None = Field(default=None, max_length=500, description="Reason for manipulation")


class SetPriceRequest(BaseModel):
    """Request schema for setting position price."""
    price: Decimal = Field(gt=0, description="New market price for the position")
    reason: str | None = Field(default=None, max_length=500, description="Reason for price change")


@router.post("/positions/{position_id}/force-profit", response_model=PositionOut)
async def force_position_profit(
    position_id: str,
    payload: PositionManipulationRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin forces profit on a user's position in real-time.

    The user will see their position gain value immediately via WebSocket update.

    Example:
    - User has a BTC position with $0 P&L
    - Admin clicks "Profit $500" button
    - User sees +$500 profit instantly
    """
    try:
        position = await admin_force_profit(
            db,
            admin,
            uuid.UUID(position_id),
            payload.amount,
            payload.reason
        )
        return position
    except AdminTradingError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "MANIPULATION_FAILED", "message": str(exc)}}
        )


@router.post("/positions/{position_id}/force-loss", response_model=PositionOut)
async def force_position_loss(
    position_id: str,
    payload: PositionManipulationRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin forces loss on a user's position in real-time.

    The user will see their position lose value immediately via WebSocket update.

    Example:
    - User has a BTC position with $0 P&L
    - Admin clicks "Loss $500" button
    - User sees -$500 loss instantly
    """
    try:
        position = await admin_force_loss(
            db,
            admin,
            uuid.UUID(position_id),
            payload.amount,
            payload.reason
        )
        return position
    except AdminTradingError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "MANIPULATION_FAILED", "message": str(exc)}}
        )


@router.post("/positions/{position_id}/set-price", response_model=PositionOut)
async def set_position_price(
    position_id: str,
    payload: SetPriceRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin directly sets the current market price of a position.

    This updates the P&L automatically based on the new price.
    The user sees the update in real-time via WebSocket.

    Example:
    - User has a BTC position with entry price $90,000
    - Admin sets current price to $95,000
    - User sees +$5,000 profit per BTC
    """
    try:
        position = await admin_set_position_price(
            db,
            admin,
            uuid.UUID(position_id),
            payload.price,
            payload.reason
        )
        return position
    except AdminTradingError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "MANIPULATION_FAILED", "message": str(exc)}}
        )

@router.get("/users/{user_id}/accounts", response_model=list[AccountOut])
async def admin_list_user_accounts(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Every account a user holds, with live margin figures."""
    from app.api.v1.endpoints.accounts import _to_out
    from app.services.account_service import list_accounts

    return [await _to_out(db, a) for a in await list_accounts(db, user_id)]


@router.patch("/accounts/{account_id}/leverage", response_model=AccountOut)
async def admin_set_leverage(
    account_id: uuid.UUID,
    payload: AdminLeverageUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set an account's leverage.

    Admin-only by design: leverage decides how much exposure a balance can
    carry, so letting a user raise their own would let them take on risk the
    platform never approved.

    Lowering leverage while positions are open does not retroactively increase
    what they reserve — each position keeps the margin it was opened with, in
    `margin_reserved`. Otherwise a routine reduction could stop-out an account
    that was never at risk.
    """
    from app.api.v1.endpoints.accounts import _to_out
    from app.core.deps import get_client_ip
    from app.models.account import Account
    from app.models.audit_log import AuditLog
    from app.models.enums import AuditActorType
    from app.services.account_service import ALLOWED_LEVERAGE

    account = await db.get(Account, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})

    if payload.leverage not in ALLOWED_LEVERAGE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_LEVERAGE", "message": f"Leverage must be one of {list(ALLOWED_LEVERAGE)}."}},
        )

    previous = account.leverage
    account.leverage = payload.leverage

    db.add(AuditLog(
        actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="ACCOUNT_LEVERAGE_UPDATED",
        resource_type="account", resource_id=account.id,
        previous_data={"leverage": previous}, new_data={"leverage": payload.leverage},
        reason=payload.reason, ip_address=get_client_ip(request),
    ))
    await db.commit()
    await db.refresh(account)
    return await _to_out(db, account)


@router.post("/accounts/{account_id}/bonus", response_model=AccountOut)
async def admin_adjust_bonus(
    account_id: uuid.UUID,
    payload: AdminBonusUpdate,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Credit or claw back promotional funds.

    Bonus is added to the tradeable balance and tracked separately, so it can
    be traded with but is excluded from `withdrawable`. A negative amount
    removes it; the balance is never taken below zero.
    """
    from decimal import Decimal

    from app.api.v1.endpoints.accounts import _to_out
    from app.core.deps import get_client_ip
    from app.models.account import Account
    from app.models.audit_log import AuditLog
    from app.models.enums import AuditActorType, TransactionType
    from app.services.ledger_service import apply_ledger_transaction

    account = await db.get(Account, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})

    delta = Decimal(payload.amount)
    if delta < 0 and account.bonus_balance + delta < 0:
        delta = -account.bonus_balance

    previous_bonus = account.bonus_balance
    account.bonus_balance = account.bonus_balance + delta

    # Bonus is spendable, so it moves the cash balance too — through the
    # ledger, which stays the source of truth for every balance change.
    await apply_ledger_transaction(
        db, account,
        TransactionType.ADMIN_CREDIT if delta >= 0 else TransactionType.ADMIN_DEBIT,
        delta, reference_type="bonus", description=payload.reason,
    )

    db.add(AuditLog(
        actor_id=admin.id, actor_type=AuditActorType.ADMIN, action="ACCOUNT_BONUS_ADJUSTED",
        resource_type="account", resource_id=account.id,
        previous_data={"bonus": str(previous_bonus)}, new_data={"bonus": str(account.bonus_balance)},
        reason=payload.reason, ip_address=get_client_ip(request),
    ))
    await db.commit()
    await db.refresh(account)
    return await _to_out(db, account)
