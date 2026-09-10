"""API endpoints for cryptocurrency deposits and deposit wallet management."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_user
from app.database.session import get_db
from app.models.deposit import Deposit
from app.models.deposit_wallet import DepositWallet
from app.models.enums import DepositStatus
from app.models.user import User
from app.schemas.deposit import (
    DepositAdmin,
    DepositCreate,
    DepositListResponse,
    DepositPublic,
    DepositUpdate,
    DepositWalletAdmin,
    DepositWalletCreate,
    DepositWalletPublic,
    DepositWalletUpdate,
)
from app.services.deposit_service import DepositError, confirm_and_credit_deposit, reject_deposit

router = APIRouter()


class DepositRejectRequest(BaseModel):
    """Request to reject a deposit."""

    reason: str


# ============= Public Deposit Wallet Endpoints =============


@router.get("/wallets", response_model=list[DepositWalletPublic])
async def get_deposit_wallets(db: AsyncSession = Depends(get_db)):
    """Get all active deposit wallet addresses."""
    result = await db.execute(select(DepositWallet).where(DepositWallet.is_active == True).order_by(DepositWallet.currency_symbol))
    wallets = result.scalars().all()
    return list(wallets)


@router.get("/wallets/{currency_id}", response_model=DepositWalletPublic)
async def get_deposit_wallet(currency_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific deposit wallet by currency ID."""
    result = await db.execute(select(DepositWallet).where(DepositWallet.currency_id == currency_id, DepositWallet.is_active == True))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit wallet not found")
    return wallet


# ============= User Deposit Endpoints =============


@router.post("/", response_model=DepositPublic, status_code=status.HTTP_201_CREATED)
async def create_deposit(
    payload: DepositCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """User creates a new deposit record."""
    # Get the deposit wallet for this currency
    result = await db.execute(select(DepositWallet).where(DepositWallet.currency_id == payload.currency_id, DepositWallet.is_active == True))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit wallet not available for this currency")

    # Create deposit record
    deposit = Deposit(
        account_id=payload.account_id,
        user_id=user.id,
        currency_id=wallet.currency_id,
        currency_symbol=wallet.currency_symbol,
        network=wallet.network,
        deposit_address=wallet.wallet_address,
        amount=payload.amount or 0,
    )
    db.add(deposit)
    await db.commit()
    await db.refresh(deposit)
    return deposit


@router.get("/", response_model=DepositListResponse)
async def get_my_deposits(
    page: int = 1, per_page: int = 50, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    """Get current user's deposit history."""
    offset = (page - 1) * per_page

    # Get total count
    count_result = await db.execute(select(Deposit).where(Deposit.user_id == user.id))
    total = len(count_result.scalars().all())

    # Get paginated deposits
    result = await db.execute(
        select(Deposit).where(Deposit.user_id == user.id).order_by(Deposit.created_at.desc()).offset(offset).limit(per_page)
    )
    deposits = result.scalars().all()

    return DepositListResponse(deposits=list(deposits), total=total, page=page, per_page=per_page)


@router.get("/{deposit_id}", response_model=DepositPublic)
async def get_deposit(deposit_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a specific deposit by ID."""
    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id, Deposit.user_id == user.id))
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit not found")
    return deposit


@router.post("/{deposit_id}/mark-paid", response_model=DepositPublic)
async def mark_deposit_as_paid(deposit_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """User marks a deposit as paid after completing their payment."""
    from datetime import datetime, timezone

    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id, Deposit.user_id == user.id))
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit not found")

    if deposit.status != DepositStatus.PENDING:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Cannot mark deposit as paid. Current status: {deposit.status.value}")

    deposit.status = DepositStatus.USER_PAID
    deposit.user_marked_paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(deposit)
    return deposit


# ============= Admin Deposit Wallet Management =============


@router.post("/admin/wallets", response_model=DepositWalletAdmin, status_code=status.HTTP_201_CREATED)
async def create_deposit_wallet(
    payload: DepositWalletCreate, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)
):
    """Admin creates a new deposit wallet address."""
    # Check if currency_id already exists
    existing = await db.execute(select(DepositWallet).where(DepositWallet.currency_id == payload.currency_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Deposit wallet already exists for this currency")

    wallet = DepositWallet(**payload.model_dump())
    db.add(wallet)
    await db.commit()
    await db.refresh(wallet)
    return wallet


@router.get("/admin/wallets", response_model=list[DepositWalletAdmin])
async def get_all_deposit_wallets(db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Admin gets all deposit wallets (including inactive)."""
    result = await db.execute(select(DepositWallet).order_by(DepositWallet.currency_symbol))
    wallets = result.scalars().all()
    return list(wallets)


@router.patch("/admin/wallets/{wallet_id}", response_model=DepositWalletAdmin)
async def update_deposit_wallet(
    wallet_id: str, payload: DepositWalletUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)
):
    """Admin updates a deposit wallet."""
    result = await db.execute(select(DepositWallet).where(DepositWallet.id == wallet_id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit wallet not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(wallet, key, value)

    await db.commit()
    await db.refresh(wallet)
    return wallet


@router.delete("/admin/wallets/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deposit_wallet(wallet_id: str, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Admin deletes a deposit wallet."""
    result = await db.execute(select(DepositWallet).where(DepositWallet.id == wallet_id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit wallet not found")

    await db.delete(wallet)
    await db.commit()


# ============= Admin Deposit Management =============


@router.get("/admin/deposits/pending/count")
async def get_pending_deposits_count(db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Get count of deposits awaiting admin confirmation (user_paid status)."""
    result = await db.execute(select(Deposit).where(Deposit.status == DepositStatus.USER_PAID))
    count = len(result.scalars().all())
    return {"count": count}


@router.get("/admin/deposits/pending", response_model=DepositListResponse)
async def get_pending_deposits(page: int = 1, per_page: int = 50, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Get all deposits with PENDING or USER_PAID status awaiting admin confirmation."""
    offset = (page - 1) * per_page

    # Get total count
    count_result = await db.execute(select(Deposit).where(Deposit.status.in_([DepositStatus.PENDING, DepositStatus.USER_PAID])))
    total = len(count_result.scalars().all())

    # Get paginated deposits
    result = await db.execute(
        select(Deposit).where(Deposit.status.in_([DepositStatus.PENDING, DepositStatus.USER_PAID])).order_by(Deposit.created_at.desc()).offset(offset).limit(per_page)
    )
    deposits = result.scalars().all()

    return DepositListResponse(deposits=list(deposits), total=total, page=page, per_page=per_page)


@router.get("/admin/deposits", response_model=DepositListResponse)
async def get_all_deposits(page: int = 1, per_page: int = 50, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Admin gets all deposits from all users."""
    offset = (page - 1) * per_page

    # Get total count
    count_result = await db.execute(select(Deposit))
    total = len(count_result.scalars().all())

    # Get paginated deposits
    result = await db.execute(select(Deposit).order_by(Deposit.created_at.desc()).offset(offset).limit(per_page))
    deposits = result.scalars().all()

    return DepositListResponse(deposits=list(deposits), total=total, page=page, per_page=per_page)


@router.get("/admin/deposits/{deposit_id}", response_model=DepositAdmin)
async def get_deposit_admin(deposit_id: str, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Admin gets a specific deposit."""
    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id))
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit not found")
    return deposit


@router.patch("/admin/deposits/{deposit_id}", response_model=DepositAdmin)
async def update_deposit(
    deposit_id: str, payload: DepositUpdate, db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)
):
    """Admin updates a deposit (status, confirmations, etc.)."""
    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id))
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Deposit not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(deposit, key, value)

    await db.commit()
    await db.refresh(deposit)
    return deposit


class DepositConfirmRequest(BaseModel):
    """Request to confirm a deposit with amount."""

    amount: float


@router.post("/admin/deposits/{deposit_id}/confirm", response_model=DepositAdmin)
async def confirm_deposit(
    deposit_id: str, payload: DepositConfirmRequest, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    """Admin confirms a deposit and credits user's account balance."""
    try:
        deposit = await confirm_and_credit_deposit(db, deposit_id, str(admin.id), payload.amount)
        return deposit
    except DepositError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/admin/deposits/{deposit_id}/reject", response_model=DepositAdmin)
async def reject_deposit_endpoint(
    deposit_id: str, payload: DepositRejectRequest, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin)
):
    """Admin rejects a deposit."""
    try:
        deposit = await reject_deposit(db, deposit_id, str(admin.id), payload.reason)
        return deposit
    except DepositError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
