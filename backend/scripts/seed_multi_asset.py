"""Seeds stocks, forex, and commodities alongside existing crypto assets.

Usage: python -m scripts.seed_multi_asset
"""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.asset import Asset
from app.models.market_price import MarketPrice

# Stocks - Major US companies
STOCKS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "base_price": Decimal("230.50"), "supply": Decimal("15470000000")},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "base_price": Decimal("425.80"), "supply": Decimal("7430000000")},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "base_price": Decimal("178.20"), "supply": Decimal("12500000000")},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "base_price": Decimal("205.90"), "supply": Decimal("10590000000")},
    {"symbol": "TSLA", "name": "Tesla, Inc.", "base_price": Decimal("345.60"), "supply": Decimal("3180000000")},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "base_price": Decimal("140.20"), "supply": Decimal("24500000000")},
    {"symbol": "META", "name": "Meta Platforms Inc.", "base_price": Decimal("585.30"), "supply": Decimal("2540000000")},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "base_price": Decimal("248.70"), "supply": Decimal("2860000000")},
    {"symbol": "V", "name": "Visa Inc.", "base_price": Decimal("315.40"), "supply": Decimal("1960000000")},
    {"symbol": "WMT", "name": "Walmart Inc.", "base_price": Decimal("98.20"), "supply": Decimal("2660000000")},
]

# Forex - Major currency pairs
FOREX = [
    {"symbol": "EURUSD", "name": "Euro / US Dollar", "base_price": Decimal("1.0420")},
    {"symbol": "GBPUSD", "name": "British Pound / US Dollar", "base_price": Decimal("1.2650")},
    {"symbol": "USDJPY", "name": "US Dollar / Japanese Yen", "base_price": Decimal("151.80")},
    {"symbol": "AUDUSD", "name": "Australian Dollar / US Dollar", "base_price": Decimal("0.6240")},
    {"symbol": "USDCAD", "name": "US Dollar / Canadian Dollar", "base_price": Decimal("1.4380")},
    {"symbol": "NZDUSD", "name": "New Zealand Dollar / US Dollar", "base_price": Decimal("0.5680")},
    {"symbol": "USDCHF", "name": "US Dollar / Swiss Franc", "base_price": Decimal("0.9020")},
    {"symbol": "EURGBP", "name": "Euro / British Pound", "base_price": Decimal("0.8240")},
    {"symbol": "EURJPY", "name": "Euro / Japanese Yen", "base_price": Decimal("158.20")},
    {"symbol": "GBPJPY", "name": "British Pound / Japanese Yen", "base_price": Decimal("192.05")},
]

# Commodities - Major tradeable commodities
COMMODITIES = [
    {"symbol": "XAUUSD", "name": "Gold", "base_price": Decimal("2920.50"), "supply": Decimal("197576")},
    {"symbol": "XAGUSD", "name": "Silver", "base_price": Decimal("32.45"), "supply": Decimal("27000000")},
    {"symbol": "WTI", "name": "Crude Oil (WTI)", "base_price": Decimal("68.20"), "supply": Decimal("0")},
    {"symbol": "BRENT", "name": "Brent Crude Oil", "base_price": Decimal("71.80"), "supply": Decimal("0")},
    {"symbol": "NATGAS", "name": "Natural Gas", "base_price": Decimal("3.45"), "supply": Decimal("0")},
    {"symbol": "COPPER", "name": "Copper", "base_price": Decimal("4.12"), "supply": Decimal("0")},
    {"symbol": "PLATINUM", "name": "Platinum", "base_price": Decimal("945.60"), "supply": Decimal("190040")},
    {"symbol": "PALLADIUM", "name": "Palladium", "base_price": Decimal("920.30"), "supply": Decimal("6310")},
    {"symbol": "WHEAT", "name": "Wheat Futures", "base_price": Decimal("5.52"), "supply": Decimal("0")},
    {"symbol": "CORN", "name": "Corn Futures", "base_price": Decimal("4.38"), "supply": Decimal("0")},
]


async def seed_assets_by_type(db, assets: list[dict], asset_type: str, is_trending: bool = False) -> None:
    """Seed assets of a specific type."""
    count = 0
    for a in assets:
        existing = (await db.execute(select(Asset).where(Asset.symbol == a["symbol"]))).scalar_one_or_none()
        if existing:
            continue

        asset = Asset(
            symbol=a["symbol"],
            name=a["name"],
            asset_type=asset_type,
            base_price=a["base_price"],
            circulating_supply=a.get("supply", Decimal(0)),
            all_time_high=a["base_price"] * Decimal("1.15"),
            all_time_low=a["base_price"] * Decimal("0.75"),
            is_trending=is_trending,
            is_new_listing=False,
            description=f"{a['name']} ({a['symbol']}) — {asset_type} asset for paper trading.",
        )
        db.add(asset)
        await db.flush()

        # Create initial market price
        db.add(MarketPrice(
            asset_id=asset.id,
            symbol=asset.symbol,
            current_price=asset.base_price,
            open_24h=asset.base_price,
            high_24h=asset.base_price * Decimal("1.02"),
            low_24h=asset.base_price * Decimal("0.98"),
            change_24h_pct=Decimal(0),
            volume_24h=asset.base_price * Decimal(10000) if asset_type != "forex" else Decimal(1000000),
            market_cap=asset.base_price * a.get("supply", Decimal(1000000)),
        ))
        count += 1

    await db.commit()
    print(f"Seeded {count} {asset_type} assets.")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_assets_by_type(db, STOCKS, "STOCK", is_trending=True)
        await seed_assets_by_type(db, FOREX, "FOREX")
        await seed_assets_by_type(db, COMMODITIES, "COMMODITY")
        print("Multi-asset seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
