"""Market price engine — LIVE or SIMULATED depending on `MARKET_DATA_SOURCE`.

In "live" mode (the default), every tick fetches real prices for the
tradeable universe from CoinGecko (`market_data_client`) in a single batched
call and persists them verbatim; a failed fetch is skipped rather than
papered over with a fake movement, so a price on screen is always traceable
to a real API response. In "simulated" mode it generates controlled-random
movement instead — kept for offline development and clearly labeled as such
in the UI.

Either way, this module updates every open position's live P&L, fills any
pending limit/stop-limit orders whose condition is now met, and publishes
WebSocket events — that downstream behavior never changes with the source.

Order execution itself always stays simulated (paper trading): there is no
real exchange connectivity, custody, or fund movement in this MVP, even
when the price feed backing it is real.
"""
import asyncio
import logging
import random
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.database.session import AsyncSessionLocal
from app.models.asset import Asset
from app.models.enums import OrderStatus, OrderType, PositionStatus
from app.models.market_price import MarketPrice
from app.models.order import Order
from app.models.position import Position
from app.services import market_data_client
from app.websocket.events import WSEvent
from app.websocket.publisher import publish_symbol_tick, publish_to_user

logger = logging.getLogger(__name__)


class SimulatedMarketEngine:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False
        # Last quotes from the slower non-crypto provider, held between its
        # polls so those assets keep their real price on every crypto tick
        # instead of reverting to an engine walk.
        self._non_crypto_quotes: dict[str, dict] = {}

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info(
                "Market engine started (source=%s, interval=%ss)",
                settings.MARKET_DATA_SOURCE, settings.MARKET_UPDATE_INTERVAL_SECONDS,
            )

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self._tick_all_assets()
            except Exception:  # noqa: BLE001
                logger.exception("Market engine tick failed")
            await asyncio.sleep(settings.MARKET_UPDATE_INTERVAL_SECONDS)

    async def _tick_all_assets(self) -> None:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Asset).where(Asset.is_active == True))  # noqa: E712
            assets = result.scalars().all()

            if settings.MARKET_DATA_SOURCE == "live":
                live_prices = await market_data_client.fetch_live_prices([a.symbol for a in assets])

                # Equities, FX and metals come from a second provider on a
                # longer cadence: they move more slowly than crypto and each
                # call costs API budget, so polling them every crypto tick
                # would burn the quota without improving the quote. Between
                # polls the previous quote stands rather than being re-fetched.
                from app.services import twelvedata_client

                if twelvedata_client.is_configured() and twelvedata_client.should_poll_now(
                    "non_crypto", settings.NON_CRYPTO_UPDATE_INTERVAL_SECONDS
                ):
                    pairs = [
                        (a.symbol, a.asset_type.value)
                        for a in assets
                        if twelvedata_client.supports(a.symbol, a.asset_type.value)
                    ]
                    self._non_crypto_quotes = await twelvedata_client.fetch_quotes(pairs)

                if settings.YAHOO_FALLBACK_ENABLED and twelvedata_client.should_poll_now(
                    "yahoo", settings.NON_CRYPTO_UPDATE_INTERVAL_SECONDS
                ):
                    from app.services import yahoo_client

                    # Whatever the contracted vendor did not return — which is
                    # everything when no key is configured.
                    outstanding = [
                        (a.symbol, a.asset_type.value)
                        for a in assets
                        if a.asset_type.value != "crypto"
                        and a.symbol not in self._non_crypto_quotes
                        and yahoo_client.supports(a.symbol, a.asset_type.value)
                    ]
                    if outstanding:
                        self._non_crypto_quotes = {
                            **self._non_crypto_quotes,
                            **await yahoo_client.fetch_quotes(outstanding),
                        }

                live_prices = {**self._non_crypto_quotes, **live_prices}

                for asset in assets:
                    quote = live_prices.get(asset.symbol)
                    if quote is not None:
                        await self._tick_asset_live(db, asset, quote)
                    else:
                        # The upstream feed only covers crypto, so in live mode
                        # every equity, FX pair and commodity used to fall
                        # through this loop untouched — not live, not
                        # simulated, just frozen at its seeded price. Anything
                        # the feed cannot quote is driven by the engine
                        # instead, which is what `data_source` already reports
                        # for it. This also covers a crypto name the feed
                        # temporarily drops (a rate-limit response), so a 429
                        # stops the chart rather than the price.
                        await self._tick_asset_simulated(db, asset)
            else:
                for asset in assets:
                    await self._tick_asset_simulated(db, asset)

            await db.commit()

        # Margin and equity are both functions of the prices just written, so
        # they are evaluated here rather than on a clock of their own.
        await self._post_tick_margin_work()

    async def _post_tick_margin_work(self) -> None:
        from app.services import twelvedata_client
        from app.services.margin_service import enforce_stop_outs, write_equity_snapshots

        async with AsyncSessionLocal() as db:
            try:
                closed = await enforce_stop_outs(db)
                if closed:
                    logger.warning("Stop-out closed %d position(s)", closed)
            except Exception:  # noqa: BLE001
                logger.exception("Stop-out pass failed")

            if twelvedata_client.should_poll_now("equity_snapshot", settings.EQUITY_SNAPSHOT_INTERVAL_SECONDS):
                try:
                    await write_equity_snapshots(db)
                except Exception:  # noqa: BLE001
                    logger.exception("Equity snapshot pass failed")

    async def _apply_new_price(self, db, asset: Asset, market_price: MarketPrice, new_price: Decimal) -> None:
        market_price.current_price = new_price
        await db.flush()

        await publish_symbol_tick(asset.symbol, WSEvent.MARKET_PRICE_UPDATE, {
            "symbol": asset.symbol,
            "price": str(new_price),
            "change_24h_pct": str(market_price.change_24h_pct),
            "high_24h": str(market_price.high_24h),
            "low_24h": str(market_price.low_24h),
            "source": settings.MARKET_DATA_SOURCE,
        })

        await self._update_open_positions(db, asset.symbol, new_price)
        await self._fill_pending_orders(db, asset.symbol, new_price)

    async def _tick_asset_live(self, db, asset: Asset, quote: dict) -> None:
        price_result = await db.execute(select(MarketPrice).where(MarketPrice.asset_id == asset.id))
        market_price = price_result.scalar_one_or_none()
        if market_price is None:
            return

        # Read defensively: only the crypto feed carries market cap, supply and
        # all-time highs. A provider that omits them used to raise KeyError here
        # and take down the whole tick cycle with it, which is why equities kept
        # their engine-walked price even once a real quote was available.
        # Missing fields keep whatever the asset already had.
        market_price.open_24h = quote.get("open_24h", market_price.open_24h)
        market_price.high_24h = quote.get("high_24h", market_price.high_24h)
        market_price.low_24h = quote.get("low_24h", market_price.low_24h)
        market_price.change_24h_pct = quote.get("change_24h_pct", market_price.change_24h_pct)
        if quote.get("volume_24h"):
            market_price.volume_24h = quote["volume_24h"]
        if quote.get("market_cap"):
            market_price.market_cap = quote["market_cap"]

        if quote.get("circulating_supply"):
            asset.circulating_supply = quote["circulating_supply"]
        if quote.get("ath"):
            asset.all_time_high = quote["ath"]
        if quote.get("atl"):
            asset.all_time_low = quote["atl"]

        await self._apply_new_price(db, asset, market_price, quote["current_price"])

    async def _tick_asset_simulated(self, db, asset: Asset) -> None:
        price_result = await db.execute(select(MarketPrice).where(MarketPrice.asset_id == asset.id))
        market_price = price_result.scalar_one_or_none()
        if market_price is None:
            return

        movement_pct = random.uniform(settings.MARKET_MIN_MOVEMENT_PCT, settings.MARKET_MAX_MOVEMENT_PCT)
        new_price = market_price.current_price * (Decimal(1) + Decimal(movement_pct) / Decimal(100))
        new_price = max(new_price, Decimal("0.00000001")).quantize(Decimal("0.00000001"))

        market_price.high_24h = max(market_price.high_24h, new_price)
        market_price.low_24h = min(market_price.low_24h, new_price)
        if market_price.open_24h:
            market_price.change_24h_pct = ((new_price - market_price.open_24h) / market_price.open_24h * 100).quantize(Decimal("0.01"))

        await self._apply_new_price(db, asset, market_price, new_price)

    async def _update_open_positions(self, db, symbol: str, new_price: Decimal) -> None:
        # Positions an admin has pinned to a price are left alone: repricing
        # them here undid the admin's change on the very next tick. Rows are
        # locked as they are read, so an admin edit saved mid-tick waits for
        # this tick to commit and then wins rather than being overwritten by the
        # stale copy read here; a row that edit already holds is skipped.
        result = await db.execute(
            select(Position)
            .where(
                Position.symbol == symbol,
                Position.status == PositionStatus.OPEN,
                Position.admin_price_override.is_(None),
            )
            .with_for_update(skip_locked=True)
        )
        positions = result.scalars().all()
        for position in positions:
            position.current_market_price = new_price
            position.current_market_value = (position.quantity * new_price).quantize(Decimal("0.01"))
            position.unrealized_profit_loss = position.current_market_value - position.total_cost_basis
            position.unrealized_profit_loss_pct = (
                (position.unrealized_profit_loss / position.total_cost_basis * 100)
                if position.total_cost_basis else Decimal(0)
            )
            await publish_to_user(position.user_id, WSEvent.POSITION_PROFIT_LOSS_UPDATED, {
                "id": str(position.id), "symbol": position.symbol,
                "current_market_price": str(position.current_market_price),
                "current_market_value": str(position.current_market_value),
                "unrealized_profit_loss": str(position.unrealized_profit_loss),
                "unrealized_profit_loss_pct": str(position.unrealized_profit_loss_pct),
            })
            await publish_to_user(position.user_id, WSEvent.PORTFOLIO_UPDATED, {"reason": "price_tick"})

    async def _fill_pending_orders(self, db, symbol: str, new_price: Decimal) -> None:
        # Import locally to avoid a circular import with trading_service.
        from app.services.trading_service import _fill_order, _limit_condition_met  # noqa: WPS433

        result = await db.execute(
            select(Order).where(
                Order.symbol == symbol,
                Order.status == OrderStatus.OPEN,
                Order.order_type.in_([OrderType.LIMIT, OrderType.STOP_LIMIT]),
            )
        )
        for order in result.scalars().all():
            if _limit_condition_met(order.order_type, order.side, order.price, order.stop_price, new_price):
                from app.models.asset import Asset as AssetModel
                from app.models.user import User as UserModel

                asset = (await db.execute(select(AssetModel).where(AssetModel.symbol == symbol))).scalar_one()
                user = await db.get(UserModel, order.user_id)
                try:
                    await _fill_order(db, user, asset, order, new_price)
                except Exception:  # noqa: BLE001
                    logger.exception("Failed to auto-fill pending order %s", order.id)


engine = SimulatedMarketEngine()
