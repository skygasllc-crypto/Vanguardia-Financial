import uuid
from decimal import Decimal

from pydantic import BaseModel


class AssetSummary(BaseModel):
    id: uuid.UUID
    symbol: str
    name: str
    asset_type: str  # crypto, stock, forex, commodity
    icon_url: str | None = None
    # Home market and listing venue. Populated for equities only — the other
    # three types are global instruments with no single home exchange.
    region: str | None = None
    exchange: str | None = None
    # Per-asset, because the platform-wide setting is only a ceiling: in live
    # mode the crypto names CoinGecko covers are real and everything else is
    # still simulated.
    data_source: str = "real"  # "live" | "real"
    current_price: Decimal
    change_24h_pct: Decimal
    market_cap: Decimal
    volume_24h: Decimal
    is_trending: bool
    is_new_listing: bool
    sparkline: list[Decimal] = []

    model_config = {"from_attributes": True}


class AssetDetail(AssetSummary):
    open_24h: Decimal
    high_24h: Decimal
    low_24h: Decimal
    circulating_supply: Decimal
    all_time_high: Decimal
    all_time_low: Decimal
    description: str | None = None


class CandlePoint(BaseModel):
    time: int
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal


class MarketDataStatus(BaseModel):
    """Tells the frontend whether prices are real or simulated, so the UI
    can label the data source honestly instead of assuming."""

    source: str  # "live" |  — the platform-wide ceiling
    provider: str
    trading_mode: str  # real
    # How the ceiling actually breaks down. Even in live mode only crypto has an
    # upstream feed, so the UI must not paint one "Live" badge over everything.
    live_symbol_count: int = 0
    simulated_symbol_count: int = 0
    live_asset_types: list[str] = []


class AssetCategoryCount(BaseModel):
    """One row of the category rail on the trading terminal: a group of assets
    and how many are in it."""

    key: str            # "crypto" | "stock" | "forex" | "commodity"
    label: str
    count: int
    # Sub-groups, used for the equity region split (United States / China).
    groups: list["AssetCategoryCount"] = []
