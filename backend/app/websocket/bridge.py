"""Consumes the `broadcast` channel from the event bus and delivers each
event to the right WebSocket connections via the ConnectionManager. This is
what actually connects "a service published an event" to "a browser tab
received it" — see `app.services.event_bus` for why Redis/in-memory is
abstracted away here.
"""
import asyncio
import logging
import uuid

from app.services.event_bus import get_event_bus
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


async def run_bridge() -> None:
    bus = await get_event_bus()
    async for message in bus.subscribe("broadcast"):
        try:
            scope = message["scope"]
            event = message["event"]
            if scope == "user":
                await manager.send_to_user(uuid.UUID(message["target"]), event)
            elif scope == "symbol":
                await manager.broadcast_price_tick(message["target"], event)
            elif scope == "all":
                for user_id in list(manager._user_connections.keys()):
                    await manager.send_to_user(user_id, event)
        except Exception:  # noqa: BLE001
            logger.exception("Error routing bridged websocket event")


def start_bridge_task() -> asyncio.Task:
    return asyncio.create_task(run_bridge())
