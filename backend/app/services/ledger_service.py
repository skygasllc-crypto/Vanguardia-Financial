"""The immutable transaction ledger — the single mechanism allowed to move
money in or out of a user's available balance. No code path in this
application may write `Account.available_balance` directly; every change
flows through `apply_ledger_transaction`, so the ledger table is always a
complete, reconcilable history of how the balance got to its current value.
"""
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.enums import TransactionType
from app.models.transaction_ledger import TransactionLedger


class InsufficientBalanceError(Exception):
    pass


def generate_transaction_ref() -> str:
    return f"TXN-{uuid.uuid4().hex[:14].upper()}"


async def apply_ledger_transaction(
    db: AsyncSession,
    account: Account,
    transaction_type: TransactionType,
    delta: Decimal,
    reference_type: str | None = None,
    reference_id: uuid.UUID | None = None,
    description: str | None = None,
    allow_negative: bool = False,
) -> TransactionLedger:
    """Apply `delta` (positive = credit, negative = debit) to `account` and
    write the corresponding ledger row in the same unit of work."""
    balance_before = account.available_balance
    balance_after = balance_before + delta

    if balance_after < 0 and not allow_negative:
        raise InsufficientBalanceError("Insufficient available balance for this transaction.")

    account.available_balance = balance_after

    entry = TransactionLedger(
        transaction_ref=generate_transaction_ref(),
        user_id=account.user_id,
        account_id=account.id,
        transaction_type=transaction_type,
        amount=abs(delta),
        currency=account.currency,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description,
    )
    db.add(entry)
    await db.flush()
    return entry
