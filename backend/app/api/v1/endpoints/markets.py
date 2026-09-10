import random
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_db
from app.models.asset import Asset
from app.models.market_price import MarketPrice
from app.schemas.market import AssetCategoryCount, AssetDetail, AssetSummary, CandlePoint, MarketDataStatus
from app.models.enums import AssetType
from app.services import market_data_client
from app.services.market_data_client import market_data_source_for

router = APIRouter()


@router.get("/status", response_model=MarketDataStatus)
async def get_market_data_status(db: AsyncSession = Depends(get_db)):
    """Tells the frontend whether prices/candles are real (live) or a
    controlled simulation, so the UI can label the data honestly.

    Reports the breakdown as well as the platform-wide setting: only crypto has
    an upstream feed, so in live mode roughly a third of the universe is real
    and the rest is still simulated. A single global flag would let the UI paint
    a "Live" badge over a simulated equity."""
    rows = (await db.execute(
        select(Asset.symbol, Asset.asset_type).where(Asset.is_active == True)  # noqa: E712
    )).all()
    live = [(sym, t) for sym, t in rows if market_data_source_for(sym, t.value) == "live"]
    live_types = sorted({t.value for _sym, t in live})

    return MarketDataStatus(
        source=settings.MARKET_DATA_SOURCE,
        provider=_provider_label(),
        trading_mode="paper",
        live_symbol_count=len(live),
        simulated_symbol_count=len(rows) - len(live),
        live_asset_types=live_types,
    )


def _provider_label() -> str:
    """Names every feed actually in play, so the status endpoint cannot claim
    CoinGecko is pricing an equity it has never heard of."""
    from app.services import twelvedata_client

    if settings.MARKET_DATA_SOURCE != "live":
        return "Simulated Engine"
    providers = ["CoinGecko"]
    if twelvedata_client.is_configured():
        providers.append("Twelve Data")
    if settings.YAHOO_FALLBACK_ENABLED:
        providers.append("Yahoo Finance")
    return " + ".join(providers)


def _to_summary(asset: Asset, price: MarketPrice) -> AssetSummary:
    return AssetSummary(
        id=asset.id, symbol=asset.symbol, name=asset.name, asset_type=asset.asset_type.value, icon_url=asset.icon_url,
        region=asset.region, exchange=asset.exchange, data_source=market_data_source_for(asset.symbol, asset.asset_type.value),
        current_price=price.current_price, change_24h_pct=price.change_24h_pct,
        market_cap=price.market_cap, volume_24h=price.volume_24h,
        is_trending=asset.is_trending, is_new_listing=asset.is_new_listing,
        sparkline=_sparkline(price.current_price, price.change_24h_pct),
    )


def _sparkline(current_price: Decimal, change_pct: Decimal) -> list[Decimal]:
    start = current_price / (1 + change_pct / 100) if change_pct != -100 else current_price
    points = []
    for i in range(20):
        progress = Decimal(i) / Decimal(19)
        noise = Decimal(random.uniform(-0.01, 0.01))
        value = start + (current_price - start) * progress + start * noise
        points.append(max(value, Decimal("0.00000001")).quantize(Decimal("0.00000001")))
    points[-1] = current_price
    return points


@router.get("", response_model=list[AssetSummary])
async def list_markets(
    category: str | None = Query(default=None, pattern="^(trending|top_gainers|top_losers|popular|new_listings)$"),
    asset_type: str | None = Query(default=None, pattern="^(crypto|stock|forex|commodity)$"),
    region: str | None = Query(default=None, description="Home market, e.g. 'United States' or 'China'. Equities only."),
    search: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """The market list. Paginated because the universe is ~400 instruments and
    every row carries a generated sparkline; the default page is deliberately
    large enough for a full asset-type tab to arrive in one request."""
    query = select(Asset, MarketPrice).join(MarketPrice, MarketPrice.asset_id == Asset.id).where(Asset.is_active == True)  # noqa: E712

    if asset_type:
        query = query.where(Asset.asset_type == AssetType(asset_type))

    if region:
        query = query.where(Asset.region == region)

    if search:
        like = f"%{search}%"
        query = query.where(or_(Asset.symbol.ilike(like), Asset.name.ilike(like)))

    # Order by traded value so the head of every list is the liquid names.
    query = query.order_by(MarketPrice.volume_24h.desc(), Asset.symbol)

    # The ranked categories have to score the whole filtered set before they can
    # take a top slice, so they skip SQL-level pagination.
    ranked = category in ("top_gainers", "top_losers", "popular")
    if not ranked:
        query = query.limit(limit).offset(offset)

    rows = (await db.execute(query)).all()
    summaries = [_to_summary(asset, price) for asset, price in rows]

    if category == "trending":
        summaries = [s for s in summaries if s.is_trending]
    elif category == "new_listings":
        summaries = [s for s in summaries if s.is_new_listing]
    elif category == "top_gainers":
        summaries = sorted(summaries, key=lambda s: s.change_24h_pct, reverse=True)[:limit]
    elif category == "top_losers":
        summaries = sorted(summaries, key=lambda s: s.change_24h_pct)[:limit]
    elif category == "popular":
        summaries = sorted(summaries, key=lambda s: s.volume_24h, reverse=True)[:limit]

    return summaries


@router.get("/categories", response_model=list[AssetCategoryCount])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """The category rail for the trading terminal: every asset class with how
    many instruments it holds, and for equities a nested split by home market
    so US and Chinese names are browsable separately."""
    type_rows = (await db.execute(
        select(Asset.asset_type, func.count())
        .where(Asset.is_active == True)  # noqa: E712
        .group_by(Asset.asset_type)
    )).all()
    counts = {t.value: n for t, n in type_rows}

    region_rows = (await db.execute(
        select(Asset.region, func.count())
        .where(Asset.is_active == True, Asset.asset_type == AssetType.STOCK, Asset.region.is_not(None))  # noqa: E712
        .group_by(Asset.region)
        .order_by(func.count().desc())
    )).all()

    labels = {"crypto": "Crypto", "stock": "Stocks", "forex": "Forex", "commodity": "Commodities"}
    return [
        AssetCategoryCount(
            key=key,
            label=label,
            count=counts.get(key, 0),
            groups=[
                AssetCategoryCount(key=region, label=region, count=n)
                for region, n in region_rows
            ] if key == "stock" else [],
        )
        for key, label in labels.items()
    ]


@router.get("/{symbol}", response_model=AssetDetail)
async def get_asset_detail(symbol: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(Asset, MarketPrice).join(MarketPrice, MarketPrice.asset_id == Asset.id).where(Asset.symbol == symbol.upper())
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ASSET_NOT_FOUND", "message": "Asset not found."}})
    asset, price = row
    return AssetDetail(
        **_to_summary(asset, price).model_dump(),
        open_24h=price.open_24h, high_24h=price.high_24h, low_24h=price.low_24h,
        circulating_supply=asset.circulating_supply, all_time_high=asset.all_time_high,
        all_time_low=asset.all_time_low, description=asset.description,
    )


@router.get("/{symbol}/candles", response_model=list[CandlePoint])
async def get_candles(
    symbol: str,
    interval: str = Query(default="1h", pattern="^(1m|5m|15m|1h|4h|1d|1w|1M)$"),
    db: AsyncSession = Depends(get_db),
):
    """OHLC candles for the requested interval.

    Routed per asset, not per platform: CoinGecko serves crypto, Twelve Data
    serves equities/FX/spot metals once a key is set, and anything neither
    covers — exchange-traded futures above all — falls through to the engine
    series, which is what actually prices it.

    Checking the platform-wide flag instead used to 503 the chart for every
    equity, FX pair and commodity, leaving 277 of 397 instruments blank."""
    row = (await db.execute(
        select(Asset, MarketPrice).join(MarketPrice, MarketPrice.asset_id == Asset.id).where(Asset.symbol == symbol.upper())
    )).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "ASSET_NOT_FOUND", "message": "Asset not found."}})
    asset, price = row

    if market_data_source_for(symbol, asset.asset_type.value) == "live":
        from app.services import twelvedata_client, yahoo_client

        candles = None
        if symbol.upper() in market_data_client.SYMBOL_TO_COINGECKO_ID:
            candles = await market_data_client.fetch_candles(symbol.upper(), interval)
        else:
            candles = await twelvedata_client.fetch_candles(symbol.upper(), asset.asset_type.value, interval)

        # Second real source before giving up. CoinGecko's free tier rate-limits
        # readily, and a 429 used to blank the chart for a crypto name whose
        # price was still ticking — USDC at 4h did exactly that while 1h and 1d
        # worked. Yahoo carries the same crypto history, so this stays real
        # data; it is not a fall back to the engine.
        if not candles and settings.YAHOO_FALLBACK_ENABLED:
            candles = await yahoo_client.fetch_candles(symbol.upper(), asset.asset_type.value, interval)
        if candles:
            return [CandlePoint(**c) for c in candles]
        # A symbol the feed does cover but could not answer for right now is a
        # genuine outage — say so rather than quietly substituting made-up bars
        # for an asset the user was told is live.
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "MARKET_DATA_UNAVAILABLE", "message": "Live chart data is temporarily unavailable."}},
        )

    interval_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400, "1w": 604800, "1M": 2592000}[interval]
    import time
    now = int(time.time())
    candles = []
    current = price.current_price
    for i in range(120, 0, -1):
        t = now - i * interval_seconds
        drift = Decimal(random.uniform(-0.008, 0.008))
        o = current
        c = max(o * (1 + drift), Decimal("0.00000001"))
        h = max(o, c) * (1 + Decimal(random.uniform(0, 0.004)))
        l = min(o, c) * (1 - Decimal(random.uniform(0, 0.004)))
        candles.append(CandlePoint(time=t, open=o.quantize(Decimal("0.00000001")), high=h.quantize(Decimal("0.00000001")),
                                    low=l.quantize(Decimal("0.00000001")), close=c.quantize(Decimal("0.00000001")),
                                    volume=Decimal(random.uniform(10, 1000)).quantize(Decimal("0.01"))))
        current = c
    candles[-1].close = price.current_price
    return candles
