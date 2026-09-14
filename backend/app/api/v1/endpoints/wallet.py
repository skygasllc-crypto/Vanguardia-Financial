import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.account import Account
from app.models.enums import AccountType
from app.models.transaction_ledger import TransactionLedger
from app.models.user import User
from app.schemas.wallet import LedgerEntryOut, WalletSummary
from app.services.account_service import AccountNotFoundError, resolve_account

router = APIRouter()


async def _account_for(
    db: AsyncSession, user: User, account_id: uuid.UUID | None, account_type: str | None
) -> Account:
    """The account a wallet request is about: the one named, else the primary
    account of the requested type (demo when neither is given, as before)."""
    try:
        return await resolve_account(
            db, user.id,
            account_id=account_id,
            account_type=AccountType(account_type) if account_type else None,
        )
    except AccountNotFoundError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}},
        ) from exc


@router.get("", response_model=WalletSummary)
async def get_wallet(
    account_id: uuid.UUID | None = None,
    account_type: str | None = Query(default=None, pattern="^(demo|real)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _account_for(db, user, account_id, account_type)
    return WalletSummary(available_balance=account.available_balance, locked_balance=account.locked_balance, currency=account.currency)


@router.get("/transactions", response_model=list[LedgerEntryOut])
async def get_transactions(
    account_id: uuid.UUID | None = None,
    account_type: str | None = Query(default=None, pattern="^(demo|real)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ledger entries for one account when scoped, so a demo account's history
    is never listed under a real one. Unscoped, every entry the user has."""
    query = select(TransactionLedger).where(TransactionLedger.user_id == user.id)
    if account_id or account_type:
        account = await _account_for(db, user, account_id, account_type)
        query = query.where(TransactionLedger.account_id == account.id)
    return (await db.execute(query.order_by(TransactionLedger.created_at.desc()))).scalars().all()
