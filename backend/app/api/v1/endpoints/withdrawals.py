import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_user
from app.database.session import get_db
from app.models.account import Account
from app.models.enums import WithdrawalStatus
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.schemas.withdrawal import (
    AdminWithdrawalRow,
    WithdrawalApprove,
    WithdrawalComplete,
    WithdrawalCreate,
    WithdrawalOut,
    WithdrawalQuote,
    WithdrawalReject,
)
from app.services.withdrawal_service import (
    MINIMUM_WITHDRAWAL,
    WithdrawalError,
    approve_withdrawal,
    cancel_withdrawal,
    complete_withdrawal,
    fee_for,
    list_for_user,
    reject_withdrawal,
    request_withdrawal,
)

router = APIRouter()


def _bad(exc: WithdrawalError) -> HTTPException:
    return HTTPException(
        status.HTTP_400_BAD_REQUEST,
        detail={"error": {"code": "WITHDRAWAL_FAILED", "message": str(exc)}},
    )


@router.get("/quote", response_model=WithdrawalQuote)
async def quote(
    account_id: uuid.UUID,
    method: str = Query(default="bank"),
    amount: float = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """What this withdrawal would cost, so the user sees the fee before
    committing rather than discovering it afterwards."""
    from decimal import Decimal

    account = await db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}})

    fee = fee_for(method)
    requested = Decimal(str(amount)).quantize(Decimal("0.01"))
    net = requested - fee
    return WithdrawalQuote(
        currency=account.currency,
        withdrawable=account.withdrawable_balance,
        minimum=MINIMUM_WITHDRAWAL,
        fee=fee,
        net_amount=net if net > 0 else Decimal(0),
    )


@router.get("", response_model=list[WithdrawalOut])
async def my_withdrawals(
    account_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_for_user(db, user.id, account_id)


@router.post("", response_model=WithdrawalOut, status_code=status.HTTP_201_CREATED)
async def create_withdrawal(
    payload: WithdrawalCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Raise a request. The funds are held immediately."""
    try:
        return await request_withdrawal(
            db, user,
            account_id=payload.account_id, amount=payload.amount, method=payload.method,
            destination=payload.destination, destination_memo=payload.destination_memo,
            user_note=payload.user_note,
        )
    except WithdrawalError as exc:
        raise _bad(exc)


@router.post("/{withdrawal_id}/cancel", response_model=WithdrawalOut)
async def cancel(withdrawal_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await cancel_withdrawal(db, user, withdrawal_id)
    except WithdrawalError as exc:
        raise _bad(exc)


# --- Admin -------------------------------------------------------------------

@router.get("/admin/queue", response_model=list[AdminWithdrawalRow])
async def admin_queue(
    status_filter: str | None = Query(default=None),
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """The review queue. Pending first, because those are holding user funds."""
    query = select(Withdrawal, User, Account).join(User, User.id == Withdrawal.user_id).join(
        Account, Account.id == Withdrawal.account_id
    )
    if status_filter:
        query = query.where(Withdrawal.status == WithdrawalStatus(status_filter))
    rows = (await db.execute(query.order_by(Withdrawal.created_at.desc()))).all()
    return [
        AdminWithdrawalRow(
            **{c.name: getattr(w, c.name) for c in Withdrawal.__table__.columns if c.name in WithdrawalOut.model_fields},
            user_email=u.email, user_full_name=u.full_name, account_number=a.account_number,
        )
        for w, u, a in rows
    ]


@router.post("/admin/{withdrawal_id}/approve", response_model=WithdrawalOut)
async def admin_approve(
    withdrawal_id: uuid.UUID, payload: WithdrawalApprove,
    admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db),
):
    try:
        return await approve_withdrawal(db, admin, withdrawal_id, payload.admin_note)
    except WithdrawalError as exc:
        raise _bad(exc)


@router.post("/admin/{withdrawal_id}/reject", response_model=WithdrawalOut)
async def admin_reject(
    withdrawal_id: uuid.UUID, payload: WithdrawalReject,
    admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db),
):
    try:
        return await reject_withdrawal(db, admin, withdrawal_id, payload.reason)
    except WithdrawalError as exc:
        raise _bad(exc)


@router.post("/admin/{withdrawal_id}/complete", response_model=WithdrawalOut)
async def admin_complete(
    withdrawal_id: uuid.UUID, payload: WithdrawalComplete,
    admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db),
):
    """Mark the payment sent. This is where money actually leaves the books."""
    try:
        return await complete_withdrawal(db, admin, withdrawal_id, payload.transaction_reference)
    except WithdrawalError as exc:
        raise _bad(exc)
