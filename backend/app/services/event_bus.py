"""Pub/sub abstraction sitting between the market engine / trading services
and the WebSocket layer.

Architecture (per spec):

    Market Data Provider -> Python Market Data Service -> Redis Pub/Sub
        -> FastAPI WebSocket Manager -> React Frontend

Redis is used when reachable (the production/Docker path — and the only
path that lets multiple API workers share ticks). In local dev without a
Redis server running, we transparently fall back to an in-process asyncio
bus with an identical publish/subscribe interface, so the app still runs
end-to-end.
"""
import asyncio
import json
import logging
from typing import AsyncIterator

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "vanguard:events:"


class InMemoryEventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    async def publish(self, channel: str, message: dict) -> None:
        for queue in self._subscribers.get(channel, []):
            queue.put_nowait(message)

    async def subscribe(self, channel: str) -> AsyncIterator[dict]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(channel, []).append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers[channel].remove(queue)


class RedisEventBus:
    def __init__(self, redis_url: str) -> None:
        self._redis = aioredis.from_url(redis_url, decode_responses=True)

    async def publish(self, channel: str, message: dict) -> None:
        await self._redis.publish(CHANNEL_PREFIX + channel, json.dumps(message, default=str))

    async def subscribe(self, channel: str) -> AsyncIterator[dict]:
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(CHANNEL_PREFIX + channel)
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                yield json.loads(message["data"])
        finally:
            await pubsub.unsubscribe(CHANNEL_PREFIX + channel)


_bus: "RedisEventBus | InMemoryEventBus | None" = None


async def get_event_bus() -> "RedisEventBus | InMemoryEventBus":
    global _bus
    if _bus is not None:
        return _bus
    try:
        candidate = RedisEventBus(settings.REDIS_URL)
        await candidate._redis.ping()
        _bus = candidate
        logger.info("Event bus: connected to Redis at %s", settings.REDIS_URL)
    except Exception as exc:  # noqa: BLE001 — any connectivity failure triggers fallback
        logger.warning("Event bus: Redis unavailable (%s) — using in-process fallback", exc)
        _bus = InMemoryEventBus()
    return _bus
