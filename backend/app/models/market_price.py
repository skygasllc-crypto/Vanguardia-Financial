import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MarketPrice(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Latest (and rolling 24h stats) simulated market price for an asset.

    Historical OHLC candles are generated on-the-fly by the simulated market
    service rather than persisted per-tick, to keep the MVP lightweight; the
    architecture leaves room for a `price_candles` table once a real market
    data provider is wired in.
    """

    __tablename__ = "market_prices"

    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), unique=True, nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    current_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    open_24h: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    high_24h: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    low_24h: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    change_24h_pct: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)
    volume_24h: Mapped[Decimal] = mapped_column(Numeric(28, 2), nullable=False, default=0)
    market_cap: Mapped[Decimal] = mapped_column(Numeric(28, 2), nullable=False, default=0)
