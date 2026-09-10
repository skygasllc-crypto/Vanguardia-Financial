"""Tracks live WebSocket connections and fans out events to the right users.

Every connected client is associated with a `user_id`. Market price ticks
are broadcast only to users who currently hold a position in, or are
watching, that symbol — per the spec's requirement to avoid pushing
irrelevant market data to every connected client.
"""
import asyncio
import logging
import uuid
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._user_connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._connection_symbols: dict[WebSocket, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._user_connections[user_id].add(websocket)

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
            self._connection_symbols.pop(websocket, None)

    async def subscribe_symbols(self, websocket: WebSocket, symbols: list[str]) -> None:
        async with self._lock:
            self._connection_symbols[websocket] = {s.upper() for s in symbols}

    async def send_to_user(self, user_id: uuid.UUID, message: dict) -> None:
        connections = list(self._user_connections.get(user_id, []))
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                logger.debug("Dropping dead websocket connection for user %s", user_id)

    async def broadcast_price_tick(self, symbol: str, message: dict) -> None:
        """Send a market price tick only to sockets subscribed to `symbol`."""
        symbol = symbol.upper()
        targets = [
            ws
            for ws, symbols in list(self._connection_symbols.items())
            if symbol in symbols
        ]
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001
                logger.debug("Dropping dead websocket connection during price broadcast")

    def user_connection_count(self, user_id: uuid.UUID) -> int:
        return len(self._user_connections.get(user_id, []))


manager = ConnectionManager()
