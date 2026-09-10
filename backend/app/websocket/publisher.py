"""Thin helpers for services to publish WebSocket events without importing
the connection manager or event bus wiring directly."""
import uuid

from app.services.event_bus import get_event_bus
from app.websocket.events import envelope


async def publish_to_user(user_id: uuid.UUID, event_type: str, payload: dict) -> None:
    bus = await get_event_bus()
    message = {"scope": "user", "target": str(user_id), "event": envelope(event_type, payload)}
    print(f"[WS PUBLISHER] Publishing to user {user_id}: {event_type}")
    print(f"[WS PUBLISHER] Message: {message}")
    await bus.publish("broadcast", message)


async def publish_symbol_tick(symbol: str, event_type: str, payload: dict) -> None:
    bus = await get_event_bus()
    await bus.publish(
        "broadcast",
        {"scope": "symbol", "target": symbol.upper(), "event": envelope(event_type, payload)},
    )


async def publish_broadcast(event_type: str, payload: dict) -> None:
    bus = await get_event_bus()
    await bus.publish(
        "broadcast",
        {"scope": "all", "target": None, "event": envelope(event_type, payload)},
    )
