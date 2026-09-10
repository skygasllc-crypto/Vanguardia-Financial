"""Seeds the full tradeable universe defined in `scripts.asset_universe`.

Idempotent: assets that already exist keep their identity and price history and
are only patched with fields the earlier, smaller seeds never set (region and
exchange). New assets are inserted with an opening MarketPrice row so they are
immediately quotable.

Usage: python -m scripts.seed_universe
"""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.asset import Asset
from app.models.enums import AssetType
from app.models.market_price import MarketPrice
from scripts.asset_universe import COMMODITIES, CRYPTO, FOREX, STOCKS

# The first N of each list are the most liquid names, so they seed the
# "trending" rails on the markets screen.
TRENDING_PER_TYPE = 8


def _rows() -> list[dict]:
    """Flatten the four typed tables into one insert-shaped list."""
    rows: list[dict] = []

    for i, (symbol, name, _cg_id, price, supply) in enumerate(CRYPTO):
        rows.append({
            "symbol": symbol, "name": name, "asset_type": AssetType.CRYPTO,
            "base_price": price, "supply": supply, "trending": i < TRENDING_PER_TYPE,
            "region": None, "exchange": None,
            "description": f"{name} ({symbol}) — cryptocurrency, priced from the live CoinGecko feed when the platform runs in live mode.",
        })

    for i, (symbol, name, exchange, region, price, supply) in enumerate(STOCKS):
        rows.append({
            "symbol": symbol, "name": name, "asset_type": AssetType.STOCK,
            "base_price": price, "supply": supply,
            "trending": i < TRENDING_PER_TYPE, "region": region, "exchange": exchange,
            "description": f"{name} ({symbol}) — {region} equity listed on {exchange}. Simulated pricing; paper-trading execution.",
        })

    for i, (symbol, name, rate) in enumerate(FOREX):
        rows.append({
            "symbol": symbol, "name": name, "asset_type": AssetType.FOREX,
            "base_price": rate, "supply": Decimal(0),
            "trending": i < TRENDING_PER_TYPE, "region": None, "exchange": None,
            "description": f"{name} spot exchange rate. Simulated pricing; paper-trading execution.",
        })

    for i, (symbol, name, price, unit) in enumerate(COMMODITIES):
        rows.append({
            "symbol": symbol, "name": name, "asset_type": AssetType.COMMODITY,
            "base_price": price, "supply": Decimal(0),
            "trending": i < TRENDING_PER_TYPE, "region": None, "exchange": None,
            "description": f"{name} — quoted in {unit}. Simulated pricing; paper-trading execution.",
        })

    return rows


async def main() -> None:
    rows = _rows()
    async with AsyncSessionLocal() as db:
        existing = {
            a.symbol: a
            for a in (await db.execute(select(Asset))).scalars().all()
        }

        inserted = updated = 0
        for r in rows:
            asset = existing.get(r["symbol"])
            if asset is not None:
                # Backfill only what the older seeds could not know about; never
                # overwrite a price the engine or the live feed has since moved.
                if asset.region != r["region"] or asset.exchange != r["exchange"]:
                    asset.region, asset.exchange = r["region"], r["exchange"]
                    updated += 1
                continue

            asset = Asset(
                symbol=r["symbol"], name=r["name"], asset_type=r["asset_type"],
                base_price=r["base_price"], circulating_supply=r["supply"],
                all_time_high=r["base_price"] * Decimal("1.35"),
                all_time_low=r["base_price"] * Decimal("0.55"),
                is_trending=r["trending"], is_new_listing=False,
                region=r["region"], exchange=r["exchange"],
                description=r["description"],
            )
            db.add(asset)
            await db.flush()

            db.add(MarketPrice(
                asset_id=asset.id, symbol=asset.symbol,
                current_price=asset.base_price, open_24h=asset.base_price,
                high_24h=asset.base_price * Decimal("1.02"),
                low_24h=asset.base_price * Decimal("0.98"),
                change_24h_pct=Decimal(0),
                volume_24h=asset.base_price * Decimal(10000),
                market_cap=asset.base_price * r["supply"],
            ))
            inserted += 1

        await db.commit()

    print(f"Universe seeded: {inserted} new assets, {updated} existing assets patched with region/exchange.")
    print(f"Defined: {len(CRYPTO)} crypto, {len(STOCKS)} stocks, {len(FOREX)} forex, {len(COMMODITIES)} commodities = {len(rows)} total.")


if __name__ == "__main__":
    asyncio.run(main())
