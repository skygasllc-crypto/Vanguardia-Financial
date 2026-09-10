import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import AccountType, PositionStatus


class AdminPosition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An admin-entered position row (spec: USER_POSITIONS), shown to the
    user alongside/instead of engine positions and always labeled
    "Admin-managed" in the UI. Distinct from `Position`, which is the
    engine-authoritative record produced by real buy/sell/close flows.
    """

    __tablename__ = "admin_positions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    account_type: Mapped[AccountType] = mapped_column(pg_enum(AccountType), default=AccountType.DEMO, nullable=False, index=True)
    asset_name: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 8), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    admin_current_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    admin_current_value: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    admin_profit_loss: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=0)
    admin_profit_loss_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)

    position_status: Mapped[PositionStatus] = mapped_column(pg_enum(PositionStatus), default=PositionStatus.OPEN, nullable=False)

    created_by_admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    updated_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
