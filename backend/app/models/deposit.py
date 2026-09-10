"""Deposit transaction model for tracking user cryptocurrency deposits."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import DepositStatus

if TYPE_CHECKING:
    from app.models.user import User


class Deposit(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User deposit transactions."""

    __tablename__ = "deposits"

    # User reference
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Deposit details
    currency_id: Mapped[str] = mapped_column(String(20), nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    #: The account to credit. Null on deposits raised before a user could hold
    #: more than one, which fall back to their primary account of that type.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )
    network: Mapped[str] = mapped_column(String(50), nullable=False)

    # Wallet and transaction info
    deposit_address: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_hash: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Amounts
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    network_fee: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    credited_amount: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)

    # Status tracking
    status: Mapped[DepositStatus] = mapped_column(pg_enum(DepositStatus), default=DepositStatus.PENDING, nullable=False, index=True)
    confirmations: Mapped[int] = mapped_column(default=0, nullable=False)
    required_confirmations: Mapped[int] = mapped_column(default=6, nullable=False)

    # Admin notes
    admin_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # User payment marking
    user_marked_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Admin confirmation tracking
    admin_confirmed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    # user: Mapped["User"] = relationship(back_populates="deposits", foreign_keys=[user_id])  # Temporarily disabled - circular import issue

    def __repr__(self) -> str:
        return f"<Deposit {self.currency_symbol} {self.amount} - {self.status.value}>"
