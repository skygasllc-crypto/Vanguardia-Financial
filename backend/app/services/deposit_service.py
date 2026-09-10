"""Service for handling deposit confirmations and balance crediting."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.deposit import Deposit
from app.models.enums import DepositStatus, TransactionType
from app.models.transaction_ledger import TransactionLedger
from app.services.trading_service import get_or_create_account


class DepositError(Exception):
    """Raised when deposit operation fails."""

    pass


async def confirm_and_credit_deposit(db: AsyncSession, deposit_id: str, admin_id: str, amount: float | None = None) -> Deposit:
    """
    Confirm a pending or user_paid deposit and credit the user's REAL account balance.

    Args:
        db: Database session
        deposit_id: UUID of the deposit to confirm
        admin_id: UUID of admin confirming the deposit
        amount: Optional amount to set before confirming (if deposit amount is 0)

    Returns:
        Updated deposit record

    Raises:
        DepositError: If deposit not found, already confirmed, or crediting fails
    """
    # Get the deposit
    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id))
    deposit = result.scalar_one_or_none()

    if not deposit:
        raise DepositError("Deposit not found")

    if deposit.status in (DepositStatus.CREDITED, DepositStatus.CONFIRMED):
        raise DepositError(f"Deposit already {deposit.status.value}")

    if deposit.status == DepositStatus.FAILED:
        raise DepositError("Cannot confirm failed deposit")

    if deposit.status == DepositStatus.CANCELLED:
        raise DepositError("Cannot confirm cancelled deposit")

    # Update amount if provided
    if amount is not None and amount > 0:
        deposit.amount = Decimal(str(amount))

    # Validate deposit has amount
    if deposit.amount <= 0:
        raise DepositError("Deposit amount must be greater than 0. Please set the amount before confirming.")

    # Admin deposits always credit REAL account, not DEMO
    # Credit the account in the deposit's currency (BTC, USDT, etc.)
    # Credit the account the deposit named; fall back to the primary real
    # account of that currency for deposits raised before accounts multiplied.
    from app.services.account_service import resolve_account

    if deposit.account_id is not None:
        account = await resolve_account(db, deposit.user_id, account_id=deposit.account_id)
    else:
        account = await get_or_create_account(db, deposit.user_id, "real", currency=deposit.currency_symbol)

    if not account:
        raise DepositError("User account not found")

    # Calculate credited amount (amount minus network fee if applicable)
    credited_amount = deposit.amount
    if deposit.network_fee:
        credited_amount = deposit.amount - deposit.network_fee

    if credited_amount <= 0:
        raise DepositError("Credited amount must be greater than 0")

    # Update deposit status
    deposit.status = DepositStatus.CREDITED
    deposit.credited_amount = credited_amount
    deposit.admin_confirmed_by = admin_id
    deposit.admin_confirmed_at = datetime.now(timezone.utc)
    deposit.admin_notes = f"Confirmed and credited by admin {admin_id}"

    # Get balance before
    balance_before = account.available_balance

    # Credit user's account
    account.available_balance += credited_amount

    # Get balance after
    balance_after = account.available_balance

    # Create transaction ledger record
    transaction = TransactionLedger(
        transaction_ref=f"DEP-{deposit.id}",
        account_id=account.id,
        user_id=deposit.user_id,
        transaction_type=TransactionType.DEPOSIT,
        amount=credited_amount,
        currency=account.currency,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type="deposit",
        reference_id=deposit.id,
        description=f"Deposit confirmed: {deposit.amount} {deposit.currency_symbol} via {deposit.network}",
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(deposit)

    # Publish real-time updates to the user's frontend
    from app.websocket.events import WSEvent
    from app.websocket.publisher import publish_to_user

    # Notify user that their deposit was credited
    await publish_to_user(
        str(deposit.user_id),
        WSEvent(
            event="deposit.credited",
            data={
                "deposit_id": str(deposit.id),
                "amount": float(credited_amount),
                "currency": deposit.currency_symbol,
                "status": deposit.status.value,
            },
        ),
    )

    # Update the user's account balance display
    await publish_to_user(
        str(deposit.user_id),
        WSEvent(
            event="account.balance_updated",
            data={
                "currency": account.currency,
                "available_balance": float(account.available_balance),
                "locked_balance": float(account.locked_balance),
            },
        ),
    )

    return deposit


async def reject_deposit(db: AsyncSession, deposit_id: str, admin_id: str, reason: str) -> Deposit:
    """
    Reject a pending deposit.

    Args:
        db: Database session
        deposit_id: UUID of the deposit to reject
        admin_id: UUID of admin rejecting the deposit
        reason: Reason for rejection

    Returns:
        Updated deposit record

    Raises:
        DepositError: If deposit not found or already processed
    """
    # Get the deposit
    result = await db.execute(select(Deposit).where(Deposit.id == deposit_id))
    deposit = result.scalar_one_or_none()

    if not deposit:
        raise DepositError("Deposit not found")

    if deposit.status != DepositStatus.PENDING:
        raise DepositError(f"Cannot reject deposit with status: {deposit.status.value}")

    # Update deposit status
    deposit.status = DepositStatus.FAILED
    deposit.admin_notes = f"Rejected by admin {admin_id}: {reason}"

    await db.commit()
    await db.refresh(deposit)

    return deposit
