import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.account import Account
from app.models.enums import AccountType
from app.models.equity_snapshot import EquitySnapshot
from app.models.user import User
from app.models.order import Order
from app.models.position import Position
from app.models.transaction_ledger import TransactionLedger
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate, EquityPoint
from app.schemas.trading import OrderOut, PositionOut
from app.schemas.wallet import LedgerEntryOut
from app.services.account_service import account_metrics, create_account, list_accounts

router = APIRouter()


async def _to_out(db: AsyncSession, account: Account) -> AccountOut:
    m = await account_metrics(db, account)
    return AccountOut(
        id=account.id, account_number=account.account_number, label=account.label,
        currency=account.currency, account_type=account.account_type,
        is_primary=account.is_primary, is_active=account.is_active,
        created_at=account.created_at, **m,
    )


@router.get("", response_model=list[AccountOut])
async def get_accounts(
    account_type: AccountType | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every account the user holds, with its live margin picture."""
    accounts = await list_accounts(db, user.id, account_type)
    return [await _to_out(db, a) for a in accounts]


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def open_account(
    payload: AccountCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open an additional account.

    Leverage on a self-opened account is fixed at 1:1 — raising it is an admin
    decision, so a user cannot grant themselves margin by opening a new one.
    """
    try:
        account = await create_account(
            db, user.id, payload.account_type,
            label=payload.label, currency=payload.currency, leverage=1,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "ACCOUNT_CREATE_FAILED", "message": str(exc)}})
    await db.commit()
    await db.refresh(account)
    return await _to_out(db, account)


@router.get("/{account_id}", response_model=AccountOut)
async def get_account(account_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})
    return await _to_out(db, account)


@router.patch("/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: uuid.UUID,
    payload: AccountUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})

    if payload.label is not None:
        account.label = payload.label

    if payload.is_primary:
        # Exactly one primary per (user, type), so promoting one demotes the rest.
        others = (await db.execute(select(Account).where(
            Account.user_id == user.id,
            Account.account_type == account.account_type,
            Account.id != account.id,
        ))).scalars().all()
        for other in others:
            other.is_primary = False
        account.is_primary = True

    await db.commit()
    await db.refresh(account)
    return await _to_out(db, account)


@router.get("/{account_id}/equity", response_model=list[EquityPoint])
async def get_equity_curve(
    account_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The account's progress chart."""
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})

    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (await db.execute(
        select(EquitySnapshot)
        .where(EquitySnapshot.account_id == account_id, EquitySnapshot.taken_at >= since)
        .order_by(EquitySnapshot.taken_at)
    )).scalars().all()
    return list(rows)


async def _owned(db: AsyncSession, account_id: uuid.UUID, user: User) -> Account:
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})
    return account


@router.get("/{account_id}/transactions", response_model=list[LedgerEntryOut])
async def get_account_transactions(
    account_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every balance movement on this account — the ledger, which is the
    source of truth for what the balance is and how it got there."""
    await _owned(db, account_id, user)
    rows = (await db.execute(
        select(TransactionLedger)
        .where(TransactionLedger.account_id == account_id)
        .order_by(TransactionLedger.created_at.desc())
        .limit(limit)
    )).scalars().all()
    return list(rows)


@router.get("/{account_id}/orders", response_model=list[OrderOut])
async def get_account_orders(
    account_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Orders placed on this account."""
    await _owned(db, account_id, user)
    rows = (await db.execute(
        select(Order).where(Order.account_id == account_id).order_by(Order.created_at.desc()).limit(limit)
    )).scalars().all()
    return list(rows)


@router.get("/{account_id}/positions", response_model=list[PositionOut])
async def get_account_positions(
    account_id: uuid.UUID,
    status_filter: str | None = Query(default=None, pattern="^(open|closed)$"),
    limit: int = Query(default=100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Positions held on this account, open or closed."""
    from app.models.enums import PositionStatus

    await _owned(db, account_id, user)
    query = select(Position).where(Position.account_id == account_id)
    if status_filter:
        query = query.where(Position.status == PositionStatus(status_filter))
    rows = (await db.execute(
        query.order_by(func.coalesce(Position.closed_at, Position.opened_at).desc()).limit(limit)
    )).scalars().all()
    return list(rows)
