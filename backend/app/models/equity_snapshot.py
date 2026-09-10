import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, UUIDPrimaryKeyMixin


class EquitySnapshot(Base, UUIDPrimaryKeyMixin):
    """A point on an account's progress chart.

    Written on a schedule rather than derived from the ledger on read: the
    ledger only moves when the user trades, so replaying it draws a flat line
    through periods where an open position was swinging in value. Equity is a
    mark-to-market figure and has to be sampled to be plotted honestly.
    """

    __tablename__ = "equity_snapshots"
    __table_args__ = (
        Index("ix_equity_snapshots_account_taken", "account_id", "taken_at"),
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    #: Cash on the account, bonus included.
    balance: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    #: Balance plus unrealised P&L on open positions — what the account is
    #: worth right now if everything were closed at market.
    equity: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    margin_used: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    open_positions: Mapped[int] = mapped_column(Numeric(6, 0), nullable=False, default=0)
