"""Accounts, margin and the numbers derived from them.

Terms used throughout, in the sense a broker means them:

* **balance**    — settled cash, bonus included.
* **equity**     — balance plus unrealised P&L; what the account is worth if
                   every open position were closed at market right now.
* **margin used** — the sum reserved by open positions (notional / leverage).
* **free margin** — equity minus margin used; what is left to open new trades.
* **margin level** — equity / margin used, as a percentage. Falling through
                   the stop-out threshold means positions get liquidated.
* **withdrawable** — free cash the user may actually take out: balance less
                   outstanding bonus, less margin currently reserved.
"""
import random
import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.account import Account
from app.models.enums import AccountType, PositionStatus
from app.models.position import Position
from app.models.user import User

#: Margin level (%) at which the engine starts force-closing positions.
STOP_OUT_LEVEL = Decimal("50")
#: Margin level (%) at which the account is flagged as at risk.
MARGIN_CALL_LEVEL = Decimal("100")

#: Leverage an admin may assign. 1 means unleveraged — a position costs its
#: full notional, which is how the platform behaved before margin existed.
ALLOWED_LEVERAGE = (1, 2, 5, 10, 20, 30, 50, 100, 200, 400, 500)

MAX_ACCOUNTS_PER_TYPE = 10


#: Letters that cannot be confused with digits when an account number is read
#: aloud or copied from a screenshot.
_SAFE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"


def _initials(full_name: str, username: str, email: str) -> str:
    """Two letters identifying the holder.

    Prefers the first letters of their first and last names, falls back to the
    first two letters of the username or email, and pads with X so the format
    is always exactly two characters — an account number whose length varies
    is a nuisance to validate and to read.
    """
    parts = [p for p in (full_name or "").replace(",", " ").split() if p[:1].isalpha()]
    if len(parts) >= 2:
        candidate = parts[0][0] + parts[-1][0]
    elif len(parts) == 1 and len(parts[0]) >= 2:
        candidate = parts[0][:2]
    else:
        source = "".join(c for c in (username or email or "") if c.isalpha())
        candidate = source[:2]

    candidate = "".join(c for c in candidate.upper() if c in _SAFE_LETTERS)
    return (candidate + "XX")[:2]


async def generate_account_number(db: AsyncSession, user: "User | None" = None) -> str:
    """A unique account number: two holder initials, two letters, two digits.

    e.g. a user named Jane Doe gets JD-KP47. The initials make an account
    recognisable to the person who owns it and to support staff reading it
    back, while the random tail keeps numbers unguessable — sequential numbers
    would let anyone enumerate how many accounts the platform has issued.
    """
    initials = _initials(
        getattr(user, "full_name", "") or "",
        getattr(user, "username", "") or "",
        getattr(user, "email", "") or "",
    ) if user is not None else "XX"

    for _ in range(40):
        tail = "".join(random.choice(_SAFE_LETTERS) for _ in range(2))
        digits = f"{random.randint(0, 99):02d}"
        candidate = f"{initials}-{tail}{digits}"
        exists = (await db.execute(select(Account.id).where(Account.account_number == candidate))).first()
        if exists is None:
            return candidate
    raise RuntimeError("Could not allocate an account number.")


async def create_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_type: AccountType,
    *,
    label: str | None = None,
    currency: str | None = None,
    leverage: int = 1,
    initial_balance: Decimal | None = None,
) -> Account:
    """Open a new account for a user.

    Demo accounts are funded with the practice balance; real accounts start at
    zero and are funded by deposit, never by opening them.
    """
    currency = currency or settings.DEFAULT_ACCOUNT_CURRENCY

    existing = (await db.execute(
        select(func.count()).select_from(Account).where(
            Account.user_id == user_id,
            Account.account_type == account_type,
            Account.is_active == True,  # noqa: E712
        )
    )).scalar() or 0
    if existing >= MAX_ACCOUNTS_PER_TYPE:
        raise ValueError(f"An account may hold at most {MAX_ACCOUNTS_PER_TYPE} {account_type.value} accounts.")

    if leverage not in ALLOWED_LEVERAGE:
        raise ValueError(f"Leverage must be one of {ALLOWED_LEVERAGE}.")

    if initial_balance is None:
        initial_balance = (
            Decimal(str(settings.STARTING_PAPER_BALANCE))
            if account_type == AccountType.DEMO and currency == "USD"
            else Decimal(0)
        )

    account = Account(
        user_id=user_id,
        account_number=await generate_account_number(db, await db.get(User, user_id)),
        label=label,
        currency=currency,
        account_type=account_type,
        available_balance=initial_balance,
        leverage=leverage,
        is_primary=existing == 0,
        is_active=True,
    )
    db.add(account)
    await db.flush()
    return account


async def list_accounts(db: AsyncSession, user_id: uuid.UUID, account_type: AccountType | None = None) -> list[Account]:
    query = select(Account).where(Account.user_id == user_id, Account.is_active == True)  # noqa: E712
    if account_type is not None:
        query = query.where(Account.account_type == account_type)
    return list((await db.execute(query.order_by(Account.account_type, Account.created_at))).scalars().all())


async def resolve_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None = None,
    account_type: AccountType | None = None,
    currency: str | None = None,
) -> Account:
    """The account an operation should act on.

    An explicit `account_id` wins and is checked against the user. Otherwise
    the primary account of the requested type is used, and one is created if
    the user has none — which keeps every existing caller working without
    having to know about multiple accounts.
    """
    if account_id is not None:
        account = await db.get(Account, account_id)
        if account is None or account.user_id != user_id:
            raise ValueError("Account not found.")
        return account

    account_type = account_type or AccountType.DEMO
    currency = currency or settings.DEFAULT_ACCOUNT_CURRENCY

    query = select(Account).where(
        Account.user_id == user_id,
        Account.account_type == account_type,
        Account.currency == currency,
        Account.is_active == True,  # noqa: E712
    ).order_by(Account.is_primary.desc(), Account.created_at)
    account = (await db.execute(query)).scalars().first()
    if account is not None:
        return account

    return await create_account(db, user_id, account_type, currency=currency)


def required_margin(notional: Decimal, leverage: int) -> Decimal:
    """Margin a position of this size reserves at this leverage."""
    lev = Decimal(max(leverage, 1))
    return (notional / lev).quantize(Decimal("0.01"))


async def recompute_margin(db: AsyncSession, account: Account) -> Decimal:
    """Rebuild `margin_used` from the open positions themselves.

    Recomputed rather than incremented: an incrementing counter drifts the
    moment any path forgets to decrement, and a wrong margin figure silently
    changes how much a user is allowed to trade.
    """
    total = (await db.execute(
        select(func.coalesce(func.sum(Position.margin_reserved), 0)).where(
            Position.account_id == account.id,
            Position.status == PositionStatus.OPEN,
        )
    )).scalar() or Decimal(0)
    account.margin_used = Decimal(str(total)).quantize(Decimal("0.01"))
    return account.margin_used


async def account_metrics(db: AsyncSession, account: Account) -> dict:
    """The figures shown on an account card."""
    rows = (await db.execute(
        select(
            func.coalesce(func.sum(Position.unrealized_profit_loss), 0),
            func.count(),
        ).where(Position.account_id == account.id, Position.status == PositionStatus.OPEN)
    )).first()
    unrealized = Decimal(str(rows[0] or 0))
    open_count = int(rows[1] or 0)

    realized = Decimal(str((await db.execute(
        select(func.coalesce(func.sum(Position.realized_profit_loss), 0)).where(
            Position.account_id == account.id, Position.status == PositionStatus.CLOSED
        )
    )).scalar() or 0))

    balance = Decimal(account.available_balance)
    equity = (balance + unrealized).quantize(Decimal("0.01"))
    margin_used = Decimal(account.margin_used)
    free_margin = (equity - margin_used).quantize(Decimal("0.01"))
    # Undefined with nothing open; reported as None rather than as infinity or
    # zero, either of which reads as a margin problem that does not exist.
    margin_level = (equity / margin_used * 100).quantize(Decimal("0.01")) if margin_used > 0 else None

    return {
        "balance": balance.quantize(Decimal("0.01")),
        "bonus": Decimal(account.bonus_balance).quantize(Decimal("0.01")),
        "withdrawable": account.withdrawable_balance.quantize(Decimal("0.01")),
        "equity": equity,
        "margin_used": margin_used,
        "free_margin": free_margin,
        "margin_level": margin_level,
        "leverage": account.leverage,
        "unrealized_pnl": unrealized.quantize(Decimal("0.01")),
        "realized_pnl": realized.quantize(Decimal("0.01")),
        "total_pnl": (unrealized + realized).quantize(Decimal("0.01")),
        "open_positions": open_count,
        "margin_call": margin_level is not None and margin_level < MARGIN_CALL_LEVEL,
        "stop_out": margin_level is not None and margin_level < STOP_OUT_LEVEL,
    }
