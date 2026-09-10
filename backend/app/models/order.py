import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import AccountType, OrderSide, OrderStatus, OrderType

if TYPE_CHECKING:
    from app.models.user import User


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    account_type: Mapped[AccountType] = mapped_column(pg_enum(AccountType), nullable=False, default=AccountType.DEMO, index=True)
    #: The specific account this belongs to. `account_type` alone stopped being
    #: enough once a user could hold several accounts of the same type.
    #: Nullable for rows written before multi-account existed.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )
    side: Mapped[OrderSide] = mapped_column(pg_enum(OrderSide), nullable=False)
    order_type: Mapped[OrderType] = mapped_column(pg_enum(OrderType), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 8), nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    stop_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    filled_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    # Optional exit brackets captured at order entry. `stop_price` above is the
    # trigger for a STOP/STOP_LIMIT *entry*; these two are the protective exits
    # carried onto the resulting position.
    take_profit_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    stop_loss_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(pg_enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)

    user: Mapped["User"] = relationship(back_populates="orders")
