"""Yahoo Finance provider — real quotes for everything CoinGecko cannot price.

CoinGecko covers crypto only. This fills the other 277 instruments (equities,
FX, and the listed commodity complex) using Yahoo's batched `spark` endpoint,
which needs no API key, so the platform reaches full live coverage without the
operator signing up for anything.

Two caveats worth knowing, both deliberate:

* This is an undocumented endpoint. It is widely used and works today, but
  Yahoo may rate-limit or change it without notice, and their terms restrict
  automated access. If it stops responding, quotes fall back to the engine
  exactly as they did before — nothing breaks, assets just stop being live.
  A contracted vendor (Twelve Data, wired up alongside this) is the answer for
  anything production-critical.

* Only genuine contract matches are mapped. Several LME metals have no Yahoo
  future, and the nearest tickers are ETNs — `JJN` quotes an iPath nickel note
  at ~$28/share, not nickel at ~$15,800/tonne. Publishing that as "Nickel"
  would put a real-looking but wrong number on the instrument, so those are
  left unmapped and their assets deactivated instead.
"""
import asyncio
import logging
import time
import urllib.parse
from decimal import Decimal
from typing import Any

import httpx

logger = logging.getLogger(__name__)

YAHOO_SPARK = "https://query1.finance.yahoo.com/v7/finance/spark"

#: Commodities to their Yahoo contract. Verified live before being added here.
COMMODITY_SYMBOLS: dict[str, str] = {
    "XAUUSD": "GC=F", "XAGUSD": "SI=F", "XPTUSD": "PL=F", "XPDUSD": "PA=F",
    "COPPER": "HG=F", "ALUMINIUM": "ALI=F", "ZINC": "ZNC=F",
    "IRONORE": "TIO=F", "STEELRB": "HRC=F", "LITHIUM": "LIT", "URANIUM": "UX=F",
    "WTI": "CL=F", "BRENT": "BZ=F", "NATGAS": "NG=F", "TTF": "TTF=F",
    "RBOB": "RB=F", "HEATOIL": "HO=F", "ETHANOL": "EH=F", "COAL": "MTF=F", "EUA": "CO2.L",
    "WHEAT": "ZW=F", "CORN": "ZC=F", "SOYBEAN": "ZS=F", "SOYOIL": "ZL=F",
    "SOYMEAL": "ZM=F", "OATS": "ZO=F", "ROUGHRICE": "ZR=F",
    "RAPESEED": "ECO.PA", "MILLWHEAT": "EBM.PA", "PALMOIL": "CPO=F",
    "SUGAR": "SB=F", "COFFEE": "KC=F", "COCOA": "CC=F", "COTTON": "CT=F",
    # LBS=F quotes but returns no bars; LBR=F is the contract with history.
    "ORANGEJUICE": "OJ=F", "LUMBER": "LBR=F",
    "LIVECATTLE": "LE=F", "FEEDERCATTLE": "GF=F", "LEANHOGS": "HE=F",
}

#: Symbols whose obvious ticker quotes but carries no usable history, and whose
#: only alternatives are funds rather than the commodity. URA tracks a uranium
#: *equity ETF* at ~$47/share, not uranium at ~$78/lb, so it is not a stand-in.
NO_HISTORY_COMMODITIES = frozenset({"URANIUM", "ETHANOL", "RAPESEED", "MILLWHEAT"})

#: No Yahoo contract exists for these, and the nearest tickers are ETNs or
#: unrelated listings. Callers deactivate them rather than invent a price.
UNAVAILABLE_COMMODITIES = frozenset({"NICKEL", "LEAD", "TIN", "GASOIL", "ROBUSTA", "CANOLA", "RUBBER"})

#: Currencies the catalogue actually quotes in. Fetched before the symbol
#: chunks so the rates are cached by the time they are needed — asking for them
#: afterwards meant the request landed on the end of a long burst, got
#: throttled, and every non-USD instrument was dropped for that cycle.
QUOTE_CURRENCIES = frozenset({
    "HKD", "CNY", "JPY", "GBP", "EUR", "CAD", "CHF", "AUD", "NZD",
    "SEK", "NOK", "DKK", "MYR", "SGD", "ZAR", "PLN", "CZK", "HUF", "TRY",
})

_client: httpx.AsyncClient | None = None
_fx_cache: dict[str, tuple[float, Decimal]] = {}
_FX_TTL_SECONDS = 900


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=20.0, headers={"User-Agent": "Mozilla/5.0"})
    return _client


def supports(symbol: str, asset_type: str) -> bool:
    if asset_type in ("stock", "forex", "crypto"):
        return True
    return asset_type == "commodity" and symbol.upper() in COMMODITY_SYMBOLS


def to_yahoo_symbol(symbol: str, asset_type: str) -> str | None:
    """Our ticker in Yahoo's notation, or None when unmapped."""
    upper = symbol.upper()
    if asset_type == "commodity":
        return COMMODITY_SYMBOLS.get(upper)
    if asset_type == "forex":
        return f"{upper}=X" if len(upper) == 6 else None
    if asset_type == "crypto":
        return f"{upper}-USD"
    # Equities: the catalogue already uses Yahoo's suffixes (.HK/.SS/.SZ), and
    # bare tickers are US listings. Share classes are the exception — Yahoo
    # writes them with a dash (BRK-B), and the dotted form 404s the whole
    # batch it travels in, not just itself.
    if "." in upper and not any(upper.endswith(sfx) for sfx in (".HK", ".SS", ".SZ", ".PA", ".L")):
        return upper.replace(".", "-")
    return upper


#: Spark rejects the request outright past ~20 symbols (HTTP 400), so this is
#: a hard ceiling rather than a tuning knob.
MAX_SYMBOLS_PER_CALL = 20


async def fetch_quotes(
    pairs: list[tuple[str, str]],
    chunk_size: int = MAX_SYMBOLS_PER_CALL,
    delay_seconds: float = 1.5,
    retries: int = 1,
) -> dict[str, dict[str, Any]]:
    """Batched quotes for `(symbol, asset_type)`, keyed by OUR symbol.

    Prices are normalised to USD: Yahoo quotes several contracts in US cents
    (`USX`) and foreign listings in their local currency, and feeding either
    straight into a USD-denominated book would misprice the asset by 100x or by
    the exchange rate.
    """
    # Keeps the asset type alongside, because whether a quote needs currency
    # conversion depends on it.
    reverse: dict[str, tuple[str, str]] = {}
    for symbol, asset_type in pairs:
        y = to_yahoo_symbol(symbol, asset_type)
        if y:
            reverse[y] = (symbol, asset_type)
    if not reverse:
        return {}

    # Warm the FX cache first, while no burst is in flight.
    await _usd_rates(set(QUOTE_CURRENCIES))

    raw: dict[str, dict[str, Any]] = {}
    keys = list(reverse.keys())
    step = min(chunk_size, MAX_SYMBOLS_PER_CALL)
    for i in range(0, len(keys), step):
        chunk = keys[i : i + min(chunk_size, MAX_SYMBOLS_PER_CALL)]
        try:
            resp = await _get_client().get(
                YAHOO_SPARK, params={"symbols": ",".join(chunk), "range": "1d", "interval": "1d"}
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception:  # noqa: BLE001
            logger.warning("Yahoo quote fetch failed for %d symbols", len(chunk), exc_info=True)
            continue

        for entry in (payload.get("spark", {}) or {}).get("result", []) or []:
            try:
                meta = entry["response"][0]["meta"]
            except (KeyError, IndexError, TypeError):
                continue
            if meta.get("regularMarketPrice") is None:
                continue
            raw[str(meta.get("symbol"))] = meta

        # Spaced out because firing every chunk back to back gets the whole
        # run throttled — the symbols are fine individually, the burst is not.
        await asyncio.sleep(delay_seconds)

    # A throttled chunk returns nothing; give the symbols it dropped another
    # pass before giving up on them for this cycle.
    for _attempt in range(retries):
        outstanding = [k for k in keys if k not in raw]
        if not outstanding:
            break
        for i in range(0, len(outstanding), step):
            chunk = outstanding[i : i + step]
            try:
                resp = await _get_client().get(
                    YAHOO_SPARK, params={"symbols": ",".join(chunk), "range": "1d", "interval": "1d"}
                )
                resp.raise_for_status()
                payload = resp.json()
            except Exception:  # noqa: BLE001
                continue
            for entry in (payload.get("spark", {}) or {}).get("result", []) or []:
                try:
                    meta = entry["response"][0]["meta"]
                except (KeyError, IndexError, TypeError):
                    continue
                if meta.get("regularMarketPrice") is not None:
                    raw[str(meta.get("symbol"))] = meta
            await asyncio.sleep(delay_seconds)

    # Convert once per currency rather than per symbol. Usually a cache hit
    # thanks to the warm-up above; anything new is fetched now.
    currencies = {str(m.get("currency") or "USD").upper() for m in raw.values()}
    rates = await _usd_rates(currencies - {"USD", "USX"})

    out: dict[str, dict[str, Any]] = {}
    for ysym, meta in raw.items():
        entry_pair = reverse.get(ysym)
        if entry_pair is None:
            continue
        ours, asset_type = entry_pair

        # An FX pair's quote is already the rate between its two currencies —
        # USDJPY of 151 means 151 yen per dollar, not "151 yen" to be converted
        # into dollars. Running it through the converter turned 151 into 0.99.
        if asset_type == "forex":
            factor = Decimal(1)
        else:
            factor = _usd_factor(str(meta.get("currency") or "USD").upper(), rates)
        if factor is None:
            continue

        price = _dec(meta.get("regularMarketPrice"))
        prev = _dec(meta.get("chartPreviousClose")) or _dec(meta.get("previousClose")) or price
        if price is None or price <= 0:
            continue

        price_usd = (price * factor).quantize(Decimal("0.00000001"))
        prev_usd = ((prev or price) * factor).quantize(Decimal("0.00000001"))
        change_pct = ((price_usd - prev_usd) / prev_usd * 100) if prev_usd else Decimal(0)

        out[ours] = {
            "current_price": price_usd,
            "open_24h": prev_usd,
            "high_24h": max(price_usd, prev_usd),
            "low_24h": min(price_usd, prev_usd),
            "change_24h_pct": change_pct.quantize(Decimal("0.0001")),
            "volume_24h": Decimal(0),
        }
    return out


def _usd_factor(currency: str, rates: dict[str, Decimal]) -> Decimal | None:
    if currency == "USD":
        return Decimal(1)
    # Yahoo reports US cents as USX for several CBOT/ICE contracts.
    if currency in ("USX", "GBX", "ZAC"):
        base = {"USX": Decimal(1), "GBX": rates.get("GBP"), "ZAC": rates.get("ZAR")}[currency]
        return (base / 100) if base is not None else None
    return rates.get(currency)


async def _usd_rates(currencies: set[str]) -> dict[str, Decimal]:
    """`CUR`→USD rates, cached briefly since they move slowly relative to ticks."""
    needed = {c for c in currencies if c not in ("USX", "GBX", "ZAC")}
    needed |= {"GBP"} if "GBX" in currencies else set()
    needed |= {"ZAR"} if "ZAC" in currencies else set()

    now = time.monotonic()
    out: dict[str, Decimal] = {}
    stale = []
    for cur in needed:
        hit = _fx_cache.get(cur)
        if hit and now - hit[0] < _FX_TTL_SECONDS:
            out[cur] = hit[1]
        else:
            stale.append(cur)

    # Chunked like any other request, and retried: losing this call drops every
    # non-USD instrument, so it is worth a second attempt.
    for attempt in range(3):
        missing = [c for c in stale if c not in out]
        if not missing:
            break
        for i in range(0, len(missing), MAX_SYMBOLS_PER_CALL):
            chunk = missing[i : i + MAX_SYMBOLS_PER_CALL]
            try:
                resp = await _get_client().get(
                    YAHOO_SPARK,
                    params={"symbols": ",".join(f"{c}USD=X" for c in chunk), "range": "1d", "interval": "1d"},
                )
                resp.raise_for_status()
                for entry in (resp.json().get("spark", {}) or {}).get("result", []) or []:
                    meta = entry["response"][0]["meta"]
                    cur = str(meta.get("symbol", ""))[:3]
                    rate = _dec(meta.get("regularMarketPrice"))
                    if cur and rate and rate > 0:
                        _fx_cache[cur] = (now, rate)
                        out[cur] = rate
            except Exception:  # noqa: BLE001
                logger.warning("Yahoo FX rate chunk failed (attempt %d)", attempt + 1)
            await asyncio.sleep(1.0)

    return out


def _dec(value: Any) -> Decimal | None:
    if value in (None, "", "null"):
        return None
    try:
        return Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None


YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"

#: Our interval -> Yahoo (interval, range). Range is chosen to give a useful
#: number of bars without asking for more history than the interval supports.
#: Every entry uses Yahoo's native bar size for the interval requested. This
#: previously mapped 1m onto 2m bars and 4h onto 1h bars, so those two buttons
#: drew the wrong candle size under the right label — the 4h chart was really
#: an hourly chart, and its ~2,100 bars were three months of hourly data rather
#: than a bar count problem.
_CHART_PARAMS = {
    "1m": ("1m", "1d"), "5m": ("5m", "5d"), "15m": ("15m", "5d"),
    "1h": ("1h", "1mo"), "4h": ("4h", "3mo"),
    "1d": ("1d", "1y"), "1w": ("1wk", "5y"), "1M": ("1mo", "10y"),
}


#: Ceiling on bars returned. A 1m/1d request is ~390 bars and 1m/5d is ~1,950;
#: more than a chart pane can show, and every one is serialised to the client.
MAX_CANDLES = 500


async def fetch_candles(symbol: str, asset_type: str, interval: str, max_candles: int = MAX_CANDLES) -> list[dict[str, Any]] | None:
    """Real OHLC history, USD-normalised, or None if unavailable.

    Charts go through the same normalisation as quotes so a chart and its price
    header cannot disagree — a HK listing drawn in HKD beneath a USD price
    would look like a broken feed.
    """
    ysym = to_yahoo_symbol(symbol, asset_type)
    params = _CHART_PARAMS.get(interval)
    if not ysym or not params:
        return None
    y_interval, y_range = params

    try:
        resp = await _get_client().get(
            f"{YAHOO_CHART}/{urllib.parse.quote(ysym)}",
            params={"interval": y_interval, "range": y_range},
        )
        resp.raise_for_status()
        result = resp.json()["chart"]["result"][0]
    except Exception:  # noqa: BLE001
        logger.warning("Yahoo candles failed for %s (%s)", symbol, interval, exc_info=True)
        return None

    stamps = result.get("timestamp") or []
    try:
        q = result["indicators"]["quote"][0]
    except (KeyError, IndexError, TypeError):
        return None

    currency = str((result.get("meta") or {}).get("currency") or "USD").upper()
    if asset_type == "forex":
        factor = Decimal(1)
    else:
        rates = await _usd_rates({currency} - {"USD", "USX"})
        factor = _usd_factor(currency, rates)
    if factor is None:
        return None

    candles: list[dict[str, Any]] = []
    for i, ts in enumerate(stamps):
        o, h, l, c = (_at(q, k, i) for k in ("open", "high", "low", "close"))
        if c is None:
            continue
        o = o or c
        candles.append({
            "time": int(ts),
            "open": (o * factor).quantize(Decimal("0.00000001")),
            "high": ((h or max(o, c)) * factor).quantize(Decimal("0.00000001")),
            "low": ((l or min(o, c)) * factor).quantize(Decimal("0.00000001")),
            "close": (c * factor).quantize(Decimal("0.00000001")),
            "volume": _dec(_raw_at(q, "volume", i)) or Decimal(0),
        })
    return candles[-max_candles:] if candles else None


def _at(quote: dict, key: str, i: int) -> Decimal | None:
    return _dec(_raw_at(quote, key, i))


def _raw_at(quote: dict, key: str, i: int):
    series = quote.get(key) or []
    return series[i] if i < len(series) else None
