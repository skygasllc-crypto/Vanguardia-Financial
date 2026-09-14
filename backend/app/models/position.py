import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import AccountType, PositionStatus

if TYPE_CHECKING:
    from app.models.user import User


class Position(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An engine-authoritative trading position, opened by a real buy
    order and closed by a real sell / close-at-market action. This is the
    accounting source of truth for the trading engine (as opposed to
    `AdminPosition`, which is a clearly-labeled admin-managed display row).

    Positions are tied to account_type (DEMO or REAL) to separate practice
    trading from real trading.
    """

    __tablename__ = "positions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    account_type: Mapped[AccountType] = mapped_column(pg_enum(AccountType), nullable=False, default=AccountType.DEMO, index=True)
    #: The specific account this belongs to. `account_type` alone stopped being
    #: enough once a user could hold several accounts of the same type.
    #: Nullable for rows written before multi-account existed.
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True, index=True
    )

    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 8), nullable=False)
    average_entry_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    total_cost_basis: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)

    current_market_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    current_market_value: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    unrealized_profit_loss: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=0)
    unrealized_profit_loss_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)
    #: Price an admin has pinned this position to. While set, the market engine
    #: does not reprice the position, so its P&L stays at the admin's figure,
    #: and closing or selling it fills at this price.
    admin_price_override: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)

    # Protective exits inherited from the opening order. Stored on the position
    # so the closed-position history can show the brackets the trade was run
    # under, not just where it actually filled.
    take_profit_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    stop_loss_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)

    #: Margin reserved when the position opened: notional / leverage. Held on
    #: the row so releasing it on close cannot disagree with what was taken,
    #: even if the account's leverage is changed while the position is open.
    margin_reserved: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    #: Leverage in force at open, kept for the trade record.
    leverage: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    status: Mapped[PositionStatus] = mapped_column(pg_enum(PositionStatus), default=PositionStatus.OPEN, nullable=False, index=True)

    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closing_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    realized_profit_loss: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)

    user: Mapped["User"] = relationship(back_populates="positions")
