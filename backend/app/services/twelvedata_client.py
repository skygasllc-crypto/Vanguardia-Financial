"""Twelve Data provider: live quotes for the assets CoinGecko cannot price.

CoinGecko covers crypto only, which left 277 of the 397 listed instruments —
every equity, FX pair and metal — with no upstream feed. Twelve Data is used
for those because a single vendor and key covers US equities, the HKEX/SSE/SZSE
listings in the China group, spot FX, and spot metals; the alternative was
three separate integrations.

Inert until `TWELVEDATA_API_KEY` is set. With no key `supports()` returns False
for everything and the engine keeps pricing these assets, so the platform
behaves exactly as it did before this module existed.

Not covered here, deliberately: exchange-traded futures (WTI, Brent, the
grains, LME base metals). Those need licensed exchange data, so they stay on
the engine and continue to report `data_source: "simulated"`.
"""
import asyncio
import logging
import time
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TWELVEDATA_BASE = "https://api.twelvedata.com"

#: Spot metals quote as currency pairs on Twelve Data.
_METAL_PAIRS = {"XAUUSD": "XAU/USD", "XAGUSD": "XAG/USD", "XPTUSD": "XPT/USD", "XPDUSD": "XPD/USD"}

#: Our exchange suffixes mapped to Twelve Data's `symbol:exchange` form.
_EXCHANGE_SUFFIXES = {".HK": "HKEX", ".SS": "SSE", ".SZ": "SZSE"}

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=TWELVEDATA_BASE, timeout=15.0)
    return _client


def is_configured() -> bool:
    return bool(settings.TWELVEDATA_API_KEY)


def supports(symbol: str, asset_type: str) -> bool:
    """Whether this provider can price the symbol."""
    if not is_configured():
        return False
    if asset_type in ("stock", "forex"):
        return True
    # Only the four spot metals; the rest of the commodity complex is futures.
    return asset_type == "commodity" and symbol.upper() in _METAL_PAIRS


def to_provider_symbol(symbol: str, asset_type: str) -> str:
    """Translate our ticker into Twelve Data's notation.

    Ours is chosen for display (EURUSD, XAUUSD, 0700.HK); theirs separates the
    pair (EUR/USD) and qualifies a listing by exchange (0700:HKEX).
    """
    upper = symbol.upper()

    if asset_type == "commodity":
        return _METAL_PAIRS.get(upper, upper)

    if asset_type == "forex":
        # Six-character majors and crosses split down the middle.
        return f"{upper[:3]}/{upper[3:]}" if len(upper) == 6 else upper

    for suffix, exchange in _EXCHANGE_SUFFIXES.items():
        if upper.endswith(suffix):
            return f"{upper[: -len(suffix)]}:{exchange}"

    return upper


async def fetch_quotes(pairs: list[tuple[str, str]]) -> dict[str, dict[str, Any]]:
    """Batched quotes for `(symbol, asset_type)` pairs, keyed by OUR symbol.

    Returns {} on failure rather than partial or invented data — the caller
    falls back to the engine for anything missing.
    """
    if not is_configured() or not pairs:
        return {}

    # Their symbol -> ours, so the response can be mapped back.
    reverse: dict[str, str] = {}
    for symbol, asset_type in pairs:
        if supports(symbol, asset_type):
            reverse[to_provider_symbol(symbol, asset_type)] = symbol
    if not reverse:
        return {}

    out: dict[str, dict[str, Any]] = {}
    # Chunked because the request is a URL query string; a few hundred symbols
    # in one call would exceed practical URL limits even where the plan allows
    # the symbol count.
    for chunk in _chunks(list(reverse.keys()), settings.TWELVEDATA_BATCH_SIZE):
        try:
            resp = await _get_client().get(
                "/quote",
                params={"symbol": ",".join(chunk), "apikey": settings.TWELVEDATA_API_KEY},
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception:  # noqa: BLE001
            logger.warning("Twelve Data quote fetch failed for %d symbols", len(chunk), exc_info=True)
            continue

        # A single symbol returns one object; several return a dict keyed by
        # symbol. An error for the whole batch arrives as {"code": ..., ...}.
        if isinstance(payload, dict) and "code" in payload and "symbol" not in payload:
            logger.warning("Twelve Data error: %s", payload.get("message"))
            continue
        rows = payload.values() if isinstance(payload, dict) and "symbol" not in payload else [payload]

        for row in rows:
            if not isinstance(row, dict) or row.get("status") == "error":
                continue
            ours = reverse.get(str(row.get("symbol", "")))
            if ours is None or row.get("close") in (None, ""):
                continue
            out[ours] = _to_quote(row)

        # Space the chunks out so a burst does not trip the per-minute limit.
        if settings.TWELVEDATA_BATCH_DELAY_SECONDS > 0:
            await asyncio.sleep(settings.TWELVEDATA_BATCH_DELAY_SECONDS)

    return out


def _to_quote(row: dict[str, Any]) -> dict[str, Any]:
    close = _dec(row.get("close"))
    open_ = _dec(row.get("open")) or close
    change_pct = _dec(row.get("percent_change")) or Decimal(0)
    return {
        "current_price": close,
        "open_24h": open_,
        "high_24h": _dec(row.get("high")) or close,
        "low_24h": _dec(row.get("low")) or close,
        "change_24h_pct": change_pct,
        "volume_24h": _dec(row.get("volume")) or Decimal(0),
        # Twelve Data's /quote carries no market cap or supply; leaving these
        # out keeps whatever the asset was seeded with rather than zeroing it.
    }


def _dec(value: Any) -> Decimal | None:
    if value in (None, "", "null"):
        return None
    try:
        return Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None


def _chunks(items: list[str], size: int):
    for i in range(0, len(items), max(size, 1)):
        yield items[i : i + size]


_last_call: dict[str, float] = {}


def should_poll_now(key: str, interval_seconds: float) -> bool:
    """Simple cadence gate so equities need not be polled as often as crypto."""
    now = time.monotonic()
    last = _last_call.get(key)
    if last is not None and now - last < interval_seconds:
        return False
    _last_call[key] = now
    return True


#: Our interval names mapped to Twelve Data's.
_INTERVALS = {
    "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1h",
    "4h": "4h", "1d": "1day", "1w": "1week", "1M": "1month",
}


async def fetch_candles(symbol: str, asset_type: str, interval: str, outputsize: int = 180) -> list[dict[str, Any]] | None:
    """OHLC history for one symbol, or None if unavailable.

    Implemented alongside `fetch_quotes` deliberately: reporting an asset as
    `data_source: "live"` on the strength of a live price while its chart was
    still engine-generated would put a real label on synthetic candles.
    """
    if not supports(symbol, asset_type):
        return None

    td_interval = _INTERVALS.get(interval)
    if td_interval is None:
        return None

    try:
        resp = await _get_client().get(
            "/time_series",
            params={
                "symbol": to_provider_symbol(symbol, asset_type),
                "interval": td_interval,
                "outputsize": outputsize,
                "order": "ASC",
                "apikey": settings.TWELVEDATA_API_KEY,
            },
        )
        resp.raise_for_status()
        payload = resp.json()
    except Exception:  # noqa: BLE001
        logger.warning("Twelve Data candles failed for %s (%s)", symbol, interval, exc_info=True)
        return None

    if not isinstance(payload, dict) or payload.get("status") == "error":
        logger.warning("Twelve Data candles error for %s: %s", symbol, payload.get("message") if isinstance(payload, dict) else payload)
        return None

    values = payload.get("values") or []
    candles: list[dict[str, Any]] = []
    for row in values:
        ts = _to_epoch(row.get("datetime"))
        close = _dec(row.get("close"))
        if ts is None or close is None:
            continue
        open_ = _dec(row.get("open")) or close
        candles.append({
            "time": ts,
            "open": open_,
            "high": _dec(row.get("high")) or max(open_, close),
            "low": _dec(row.get("low")) or min(open_, close),
            "close": close,
            "volume": _dec(row.get("volume")) or Decimal(0),
        })
    return candles or None


def _to_epoch(value: Any) -> int | None:
    """Twelve Data returns 'YYYY-MM-DD HH:MM:SS' intraday and 'YYYY-MM-DD' daily."""
    if not value:
        return None
    from datetime import datetime, timezone as _tz

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return int(datetime.strptime(str(value), fmt).replace(tzinfo=_tz.utc).timestamp())
        except ValueError:
            continue
    return None
