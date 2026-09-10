import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Enum as SQLAEnum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AssetType


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A tradeable asset (crypto, stock, forex, commodity)."""

    __tablename__ = "assets"

    symbol: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(SQLAEnum(AssetType), nullable=False, default=AssetType.CRYPTO, index=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Listing venue and country/region. Only meaningful for equities, where a
    # US listing and a mainland-China listing are genuinely different markets
    # (hours, currency, settlement); left NULL for crypto/forex/commodities,
    # which are global instruments with no single home exchange.
    region: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    exchange: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_trending: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_new_listing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    base_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    circulating_supply: Mapped[Decimal] = mapped_column(Numeric(28, 2), nullable=False, default=0)
    all_time_high: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=0)
    all_time_low: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    def __repr__(self) -> str:
        return f"<Asset {self.symbol} ({self.asset_type.value})>"
