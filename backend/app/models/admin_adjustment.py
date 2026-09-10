import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import AdjustmentType


class AdminAdjustment(Base, UUIDPrimaryKeyMixin):
    """Record of an admin-initiated balance adjustment. Always paired 1:1
    with a `TransactionLedger` row (`transaction_id`) — this table carries
    the adjustment's administrative metadata (reason, reference, notes)
    that doesn't belong on the generic ledger schema.
    """

    __tablename__ = "admin_adjustments"

    admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_ledger.id"), nullable=False, index=True)

    adjustment_type: Mapped[AdjustmentType] = mapped_column(pg_enum(AdjustmentType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")

    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    internal_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
