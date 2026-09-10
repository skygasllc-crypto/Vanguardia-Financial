import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import AccountType

if TYPE_CHECKING:
    from app.models.user import User


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One tradeable account. A user may hold several of each type.

    Previously a user had exactly one account per (currency, type) — enforced
    by a unique constraint. That is gone: a trader can now run several accounts
    side by side, each with its own balance, leverage and history, the way a
    broker issues multiple account numbers under one login. `account_number`
    is the stable public identifier; `label` is the user's own name for it.

    `available_balance` / `locked_balance` are maintained transactionally in
    lock-step with `TransactionLedger` inserts — the ledger is the source of
    truth and audit trail; these columns are a fast-read cache of its result,
    never edited independently of a ledger entry.
    """

    __tablename__ = "accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    #: Public identifier, e.g. "VG-100234". Unique across the platform.
    account_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    #: The user's own name for the account. Optional.
    label: Mapped[str | None] = mapped_column(String(60), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    account_type: Mapped[AccountType] = mapped_column(pg_enum(AccountType), nullable=False, default=AccountType.DEMO, index=True)
    #: The account selected by default for its type. Exactly one per (user, type).
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    available_balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    locked_balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)

    #: Credited promotional funds. Tradeable and counted in equity, but not
    #: withdrawable — `withdrawable_balance` subtracts whatever remains
    #: outstanding, so a user cannot deposit a bonus and cash it straight out.
    bonus_balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)

    #: Margin multiplier, admin-controlled. 100 means 1:100 — a $10,000
    #: notional position reserves $100 of margin.
    leverage: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    #: Margin currently reserved by open positions. Rebuilt from positions on
    #: every open/close rather than incremented, so it cannot drift.
    margin_used: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)

    user: Mapped["User"] = relationship(back_populates="accounts")

    @property
    def withdrawable_balance(self) -> Decimal:
        """Cash the user may actually take out.

        Bonus funds can be traded but not withdrawn, so they are deducted.
        Margin backing open positions is likewise unavailable until closed.
        """
        # Held funds need no subtraction of their own: taking a hold debits
        # `available_balance` and credits `locked_balance` in the same unit of
        # work, so money behind a pending withdrawal is already missing from
        # the figure below. A future path that locks *without* debiting would
        # have to subtract `locked_balance` here as well.
        free = self.available_balance - self.bonus_balance - self.margin_used
        return free if free > 0 else Decimal(0)
