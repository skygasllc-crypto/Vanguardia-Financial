import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import WithdrawalStatus

if TYPE_CHECKING:
    pass


class Withdrawal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A request to take money off the platform.

    Raised by the account holder and settled by an admin — nothing leaves
    automatically. The amount is moved into the account's `locked_balance` as
    soon as the request is created, so it cannot be traded or withdrawn twice
    while the request is pending; approving converts that hold into a debit,
    and rejecting or cancelling releases it.
    """

    __tablename__ = "withdrawals"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    #: The account being drawn down. Each account holds its own balance, so a
    #: withdrawal has to name one.
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)

    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    #: What the user asked for, before fees.
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    #: Deducted from `amount`; what the platform keeps.
    fee: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    #: What the user actually receives — `amount` less `fee`. Stored rather
    #: than recomputed so a later change to the fee schedule cannot rewrite
    #: what a historical request promised.
    net_amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)

    #: How the money leaves: a chain name for crypto, "bank" otherwise.
    method: Mapped[str] = mapped_column(String(40), nullable=False)
    #: Crypto address, or free-text bank details.
    destination: Mapped[str] = mapped_column(String(500), nullable=False)
    #: Memo/tag for chains that need one; omitting it can make funds
    #: unrecoverable on XRP and XLM.
    destination_memo: Mapped[str | None] = mapped_column(String(120), nullable=True)

    status: Mapped[WithdrawalStatus] = mapped_column(
        pg_enum(WithdrawalStatus), default=WithdrawalStatus.PENDING, nullable=False, index=True
    )

    user_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Why a request was refused. Required on rejection so the decision is
    #: reviewable and the user can be told something specific.
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: On-chain hash or bank reference, once sent.
    transaction_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<Withdrawal {self.currency} {self.amount} - {self.status.value}>"
