"""Withdrawal requests: raising, approving, rejecting.

Money never leaves automatically — every request is settled by an admin. The
one rule that carries the most weight here is that funds are **held at request
time**, not at approval time. Without that hold a user can request a
withdrawal, trade the same balance away while the request sits in the queue,
and leave the account negative when it is eventually approved.

The hold moves the money out of `Account.available_balance` and into
`Account.locked_balance`, so `withdrawable_balance` stops counting it and a
second request cannot draw on what the first one has claimed.
"""
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import TransactionType, WithdrawalStatus
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.services.ledger_service import apply_ledger_transaction

logger = logging.getLogger(__name__)

#: Flat fee per withdrawal, by method. Charged on the requested amount so the
#: user sees exactly what they will receive before confirming.
METHOD_FEES: dict[str, Decimal] = {
    "BTC": Decimal("0.00"),
    "USDT": Decimal("1.00"),
    "TRX": Decimal("1.00"),
    "bank": Decimal("15.00"),
}

MINIMUM_WITHDRAWAL = Decimal("10.00")

#: States an admin has not yet finished with. A request in any of these is
#: still holding the user's funds.
OPEN_STATUSES = (WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED)


class WithdrawalError(Exception):
    """A request that cannot be honoured, with a reason fit to show the user."""


def fee_for(method: str) -> Decimal:
    return METHOD_FEES.get(method, METHOD_FEES["bank"])


async def request_withdrawal(
    db: AsyncSession,
    user: User,
    *,
    account_id: uuid.UUID,
    amount: Decimal,
    method: str,
    destination: str,
    destination_memo: str | None = None,
    user_note: str | None = None,
) -> Withdrawal:
    """Raise a request and hold the funds behind it."""
    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise WithdrawalError("Account not found.")

    if account.account_type.value == "demo":
        raise WithdrawalError("Demo accounts hold practice funds and cannot be withdrawn from.")

    amount = Decimal(amount).quantize(Decimal("0.01"))
    if amount < MINIMUM_WITHDRAWAL:
        raise WithdrawalError(f"The minimum withdrawal is {MINIMUM_WITHDRAWAL} {account.currency}.")

    if not destination.strip():
        raise WithdrawalError("A destination address or bank detail is required.")

    # `withdrawable_balance` already nets off credits and margin, and the hold
    # taken below moves the money out of `available_balance`, so a second
    # request cannot claim what the first one is already holding.
    available = account.withdrawable_balance
    if amount > available:
        raise WithdrawalError(
            f"You can withdraw up to {available} {account.currency}. "
            "Promotional credits and margin backing open positions are not withdrawable."
        )

    fee = fee_for(method)
    if amount <= fee:
        raise WithdrawalError(f"The amount must exceed the {fee} {account.currency} fee for this method.")

    withdrawal = Withdrawal(
        user_id=user.id,
        account_id=account.id,
        currency=account.currency,
        amount=amount,
        fee=fee,
        net_amount=(amount - fee).quantize(Decimal("0.01")),
        method=method,
        destination=destination.strip(),
        destination_memo=(destination_memo or "").strip() or None,
        user_note=(user_note or "").strip() or None,
        status=WithdrawalStatus.PENDING,
    )
    db.add(withdrawal)

    # Hold the money. Balance is unchanged — the funds are still the user's —
    # but they are no longer spendable.
    account.available_balance -= amount
    account.locked_balance += amount

    await db.commit()
    await db.refresh(withdrawal)
    logger.info("Withdrawal %s raised for %s %s on %s", withdrawal.id, amount, account.currency, account.account_number)
    return withdrawal


async def cancel_withdrawal(db: AsyncSession, user: User, withdrawal_id: uuid.UUID) -> Withdrawal:
    """User withdraws their own request; the hold is released."""
    withdrawal = await db.get(Withdrawal, withdrawal_id)
    if withdrawal is None or withdrawal.user_id != user.id:
        raise WithdrawalError("Withdrawal not found.")
    if withdrawal.status != WithdrawalStatus.PENDING:
        raise WithdrawalError(f"A {withdrawal.status.value} withdrawal cannot be cancelled.")

    await _release_hold(db, withdrawal)
    withdrawal.status = WithdrawalStatus.CANCELLED
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


async def reject_withdrawal(
    db: AsyncSession, admin: User, withdrawal_id: uuid.UUID, reason: str
) -> Withdrawal:
    """Admin declines; the hold is released and the money is spendable again."""
    withdrawal = await db.get(Withdrawal, withdrawal_id)
    if withdrawal is None:
        raise WithdrawalError("Withdrawal not found.")
    if withdrawal.status not in OPEN_STATUSES:
        raise WithdrawalError(f"A {withdrawal.status.value} withdrawal cannot be rejected.")
    if not reason.strip():
        raise WithdrawalError("A reason is required when rejecting a withdrawal.")

    if withdrawal.status == WithdrawalStatus.PENDING:
        # Still held — releasing it is enough, nothing has left the books.
        await _release_hold(db, withdrawal)
    else:
        # Already approved, so the money was debited. Put it back through the
        # ledger rather than silently adjusting the balance, or the account
        # would show a withdrawal with no matching return.
        account = await db.get(Account, withdrawal.account_id)
        if account is not None:
            await apply_ledger_transaction(
                db, account, TransactionType.ADMIN_CREDIT, withdrawal.amount,
                reference_type="withdrawal", reference_id=withdrawal.id,
                description=f"Withdrawal reversed: {reason.strip()[:120]}",
            )

    withdrawal.status = WithdrawalStatus.REJECTED
    withdrawal.rejection_reason = reason.strip()
    withdrawal.reviewed_by = admin.id
    withdrawal.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


async def approve_withdrawal(
    db: AsyncSession, admin: User, withdrawal_id: uuid.UUID, admin_note: str | None = None
) -> Withdrawal:
    """Admin approves — and the money leaves the account here.

    The hold taken at request time is converted into a real debit and written
    to the ledger, so the user sees it in their transaction history as soon as
    it is approved rather than waiting for the payment to be marked sent.

    Because the funds are gone at this point, reversing an approved withdrawal
    is a refund rather than releasing a hold — `reject_withdrawal` handles both.
    """
    withdrawal = await db.get(Withdrawal, withdrawal_id)
    if withdrawal is None:
        raise WithdrawalError("Withdrawal not found.")
    if withdrawal.status != WithdrawalStatus.PENDING:
        raise WithdrawalError(f"A {withdrawal.status.value} withdrawal cannot be approved.")

    account = await db.get(Account, withdrawal.account_id)
    if account is None:
        raise WithdrawalError("Account not found.")

    # Release the hold, then debit through the ledger. Order matters: the
    # ledger stamps balance_before/after from `available_balance`, so debiting
    # while the funds were still held would record a balance the account never
    # actually had.
    account.locked_balance -= withdrawal.amount
    account.available_balance += withdrawal.amount

    await apply_ledger_transaction(
        db, account, TransactionType.WITHDRAWAL, -withdrawal.amount,
        reference_type="withdrawal", reference_id=withdrawal.id,
        description=f"Withdrawal to {withdrawal.method} ({withdrawal.destination[:24]}…)",
    )

    withdrawal.status = WithdrawalStatus.APPROVED
    withdrawal.admin_note = (admin_note or "").strip() or None
    withdrawal.reviewed_by = admin.id
    withdrawal.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(withdrawal)
    logger.info("Withdrawal %s approved and debited", withdrawal.id)
    return withdrawal


async def complete_withdrawal(
    db: AsyncSession, admin: User, withdrawal_id: uuid.UUID, transaction_reference: str | None = None
) -> Withdrawal:
    """Record that the payment has actually been sent.

    Purely bookkeeping — the balance moved at approval. This exists so the
    on-chain hash or bank reference can be attached to the request after the
    fact, and so the queue distinguishes "approved, not yet paid" from "paid".
    """
    withdrawal = await db.get(Withdrawal, withdrawal_id)
    if withdrawal is None:
        raise WithdrawalError("Withdrawal not found.")
    if withdrawal.status != WithdrawalStatus.APPROVED:
        raise WithdrawalError("Only an approved withdrawal can be marked as sent.")

    withdrawal.status = WithdrawalStatus.COMPLETED
    withdrawal.completed_at = datetime.now(timezone.utc)
    withdrawal.transaction_reference = (transaction_reference or "").strip() or None
    await db.commit()
    await db.refresh(withdrawal)
    logger.info("Withdrawal %s marked sent", withdrawal.id)
    return withdrawal


async def _release_hold(db: AsyncSession, withdrawal: Withdrawal) -> None:
    """Return held funds to spendable balance."""
    account = await db.get(Account, withdrawal.account_id)
    if account is None:
        return
    account.locked_balance -= withdrawal.amount
    account.available_balance += withdrawal.amount


async def list_for_user(db: AsyncSession, user_id: uuid.UUID, account_id: uuid.UUID | None = None) -> list[Withdrawal]:
    query = select(Withdrawal).where(Withdrawal.user_id == user_id)
    if account_id is not None:
        query = query.where(Withdrawal.account_id == account_id)
    return list((await db.execute(query.order_by(Withdrawal.created_at.desc()))).scalars().all())
