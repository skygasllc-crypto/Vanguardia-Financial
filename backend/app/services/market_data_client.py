"""Real live market data client (CoinGecko public API).

This is the one place that talks to an external market data provider. It
never fabricates a number: on any failure it returns `None` (for the price
tick) or whatever was last successfully cached (for candles), and the caller
is responsible for skipping the update rather than inventing a value. That
keeps every price ever shown to a user traceable back to a real API
response, which is what lets the frontend label this data "Live Market
Data" honestly.
"""
import logging
import time
from decimal import Decimal
from typing import Any

import httpx

from scripts.asset_universe import CRYPTO as _CRYPTO_UNIVERSE

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Our seeded crypto universe mapped to CoinGecko coin ids, derived from the
# same table the seeder uses so the two can never drift apart. Only crypto has
# a live upstream: equities, FX and commodities are priced by the simulated
# engine, and `market_data_source_for()` below is what the API reports per
# asset so the UI can label each one honestly.
SYMBOL_TO_COINGECKO_ID: dict[str, str] = {
    symbol: coingecko_id for symbol, _name, coingecko_id, _price, _supply in _CRYPTO_UNIVERSE
}
COINGECKO_ID_TO_SYMBOL = {v: k for k, v in SYMBOL_TO_COINGECKO_ID.items()}


def market_data_source_for(symbol: str, asset_type: str | None = None) -> str:
    """Whether a given symbol's price is a real upstream quote or simulated.

    The platform-wide MARKET_DATA_SOURCE setting is a ceiling, not a promise:
    coverage is per asset. CoinGecko prices crypto; Twelve Data prices
    equities, FX and spot metals once a key is configured; everything else —
    exchange-traded futures above all — is the engine. Callers use this to
    label individual rows rather than the whole market."""
    from app.core.config import settings
    from app.services import twelvedata_client

    if settings.MARKET_DATA_SOURCE != "live":
        return "simulated"

    if symbol.upper() in SYMBOL_TO_COINGECKO_ID:
        return "live"

    if asset_type and twelvedata_client.supports(symbol, asset_type):
        return "live"

    from app.services import yahoo_client

    if asset_type and settings.YAHOO_FALLBACK_ENABLED and yahoo_client.supports(symbol, asset_type):
        return "live"

    return "simulated"


INTERVAL_SECONDS: dict[str, int] = {
    "1m": 60, "5m": 300, "15m": 900, "1h": 3600,
    "4h": 14400, "1d": 86400, "1w": 604800, "1M": 2592000,
}

# CoinGecko's `days` param controls the granularity it returns: days=1 gives
# ~5-minute points, 2-90 gives hourly points, beyond that daily points.
#
# The source must be FINER than the bucket we aggregate into, or every bucket
# receives a single point and open == high == low == close — candles that draw
# as flat lines with no body. That was happening on 1h (the default interval)
# and 1d, which asked for hourly and daily points respectively and then bucketed
# them at exactly that size.
#
# 1h therefore reads 5-minute points (~12 per candle) at the cost of a shorter
# window, and 1d reads hourly points (24 per candle). 1m and 5m cannot be made
# to work properly: 5 minutes is the finest CoinGecko serves, so those two are
# inherently coarse and are left at the finest available.
_DAYS_FOR_INTERVAL: dict[str, str] = {
    "1m": "1", "5m": "1", "15m": "1",
    "1h": "1", "4h": "90",
    "1d": "90", "1w": "365", "1M": "max",
}

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=COINGECKO_BASE, timeout=10.0)
    return _client


async def fetch_live_prices(symbols: list[str]) -> dict[str, dict[str, Any]]:
    """One batched call for every symbol's current price + 24h stats.
    Returns {} on any failure — callers must not substitute fake movement."""
    ids = [SYMBOL_TO_COINGECKO_ID[s] for s in symbols if s in SYMBOL_TO_COINGECKO_ID]
    if not ids:
        return {}
    try:
        client = _get_client()
        resp = await client.get(
            "/coins/markets",
            params={"vs_currency": "usd", "ids": ",".join(ids), "price_change_percentage": "24h"},
        )
        resp.raise_for_status()
        rows = resp.json()
    except Exception:  # noqa: BLE001
        logger.warning("Live market data fetch failed", exc_info=True)
        return {}

    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        symbol = COINGECKO_ID_TO_SYMBOL.get(row["id"])
        if not symbol:
            continue
        current_price = Decimal(str(row["current_price"]))
        change_pct = Decimal(str(row.get("price_change_percentage_24h") or 0))
        open_24h = current_price / (Decimal(1) + change_pct / 100) if change_pct != -100 else current_price
        out[symbol] = {
            "current_price": current_price,
            "open_24h": open_24h.quantize(Decimal("0.00000001")),
            "high_24h": Decimal(str(row.get("high_24h") or row["current_price"])),
            "low_24h": Decimal(str(row.get("low_24h") or row["current_price"])),
            "change_24h_pct": change_pct,
            "volume_24h": Decimal(str(row.get("total_volume") or 0)),
            "market_cap": Decimal(str(row.get("market_cap") or 0)),
            "circulating_supply": Decimal(str(row.get("circulating_supply") or 0)),
            "ath": Decimal(str(row.get("ath") or 0)),
            "atl": Decimal(str(row.get("atl") or 0)),
        }
    return out


_candle_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_CANDLE_CACHE_TTL_SECONDS = 90


async def fetch_candles(symbol: str, interval: str) -> list[dict[str, Any]] | None:
    """Real historical prices bucketed into OHLC candles for `interval`.
    Returns None on failure (caller should fall back to its own cache)."""
    coin_id = SYMBOL_TO_COINGECKO_ID.get(symbol)
    if coin_id is None:
        return None

    days = _DAYS_FOR_INTERVAL[interval]
    cache_key = f"{coin_id}:{days}"
    now = time.monotonic()
    cached = _candle_cache.get(cache_key)
    raw_prices: list[list[float]] | None = None
    raw_volumes: list[list[float]] | None = None

    if cached and now - cached[0] < _CANDLE_CACHE_TTL_SECONDS:
        raw_prices, raw_volumes = cached[1]  # type: ignore[misc]
    else:
        try:
            client = _get_client()
            resp = await client.get(f"/coins/{coin_id}/market_chart", params={"vs_currency": "usd", "days": days})
            resp.raise_for_status()
            data = resp.json()
            raw_prices = data.get("prices", [])
            raw_volumes = data.get("total_volumes", [])
            _candle_cache[cache_key] = (now, (raw_prices, raw_volumes))  # type: ignore[assignment]
        except Exception:  # noqa: BLE001
            logger.warning("Candle fetch failed for %s (%s)", symbol, interval, exc_info=True)
            if cached:
                raw_prices, raw_volumes = cached[1]  # type: ignore[misc]
            else:
                return None

    if not raw_prices:
        return None

    return _bucket_into_candles(raw_prices, raw_volumes or [], INTERVAL_SECONDS[interval])


def _bucket_into_candles(
    raw_prices: list[list[float]], raw_volumes: list[list[float]], bucket_seconds: int, max_candles: int = 180,
) -> list[dict[str, Any]]:
    volume_by_ts = {int(ts // 1000): vol for ts, vol in raw_volumes}
    buckets: dict[int, list[tuple[int, float]]] = {}
    for ts_ms, price in raw_prices:
        ts = int(ts_ms // 1000)
        bucket_ts = ts - (ts % bucket_seconds)
        buckets.setdefault(bucket_ts, []).append((ts, price))

    candles: list[dict[str, Any]] = []
    for bucket_ts in sorted(buckets.keys()):
        points = sorted(buckets[bucket_ts])
        prices = [p for _, p in points]
        volume = sum(volume_by_ts.get(ts, 0) for ts, _ in points)
        candles.append({
            "time": bucket_ts,
            "open": Decimal(str(prices[0])),
            "high": Decimal(str(max(prices))),
            "low": Decimal(str(min(prices))),
            "close": Decimal(str(prices[-1])),
            "volume": Decimal(str(volume)),
        })
    return candles[-max_candles:]
