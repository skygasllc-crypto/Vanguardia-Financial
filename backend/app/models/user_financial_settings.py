import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserFinancialSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin-managed override of a user's displayed account summary.

    When `is_active` is True, the portfolio API serves these figures instead
    of the ledger-computed ones, and tags the response `data_source:
    "admin_managed"` so the UI can render the required "Admin-managed /
    Demo" disclosure. The underlying ledger keeps accumulating in parallel
    and is never overwritten — deactivating this row reverts the user to
    live engine-computed figures.
    """

    __tablename__ = "user_financial_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    total_account_balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    available_balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    portfolio_value: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    total_profit: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    total_loss: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    net_profit_loss: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    total_invested_amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    daily_profit_loss: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    profit_loss_percentage: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")

    updated_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
