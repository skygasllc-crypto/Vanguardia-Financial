from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.transaction_ledger import TransactionLedger
from app.models.user import User
from app.schemas.wallet import LedgerEntryOut, WalletSummary
from app.services.trading_service import get_or_create_account

router = APIRouter()


@router.get("", response_model=WalletSummary)
async def get_wallet(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await get_or_create_account(db, user.id)
    return WalletSummary(available_balance=account.available_balance, locked_balance=account.locked_balance, currency=account.currency)


@router.get("/transactions", response_model=list[LedgerEntryOut])
async def get_transactions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(TransactionLedger).where(TransactionLedger.user_id == user.id).order_by(TransactionLedger.created_at.desc())
    return (await db.execute(query)).scalars().all()
