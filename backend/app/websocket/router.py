import logging
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_token
from app.database.session import AsyncSessionLocal
from app.models.position import Position
from app.models.watchlist import WatchlistItem
from app.models.asset import Asset
from app.models.enums import PositionStatus
from app.websocket.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


async def _resolve_user_id(token: str) -> uuid.UUID | None:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        return None


async def _default_symbols(user_id: uuid.UUID) -> list[str]:
    """A user is auto-subscribed to symbols they hold or watch, so the
    server never pushes ticks for assets irrelevant to that client."""
    async with AsyncSessionLocal() as db:
        positions = await db.execute(
            select(Position.symbol).where(Position.user_id == user_id, Position.status == PositionStatus.OPEN)
        )
        watchlist = await db.execute(
            select(Asset.symbol).join(WatchlistItem, WatchlistItem.asset_id == Asset.id).where(WatchlistItem.user_id == user_id)
        )
        symbols = {row[0] for row in positions.all()} | {row[0] for row in watchlist.all()}
        return list(symbols)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = await _resolve_user_id(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    await manager.connect(user_id, websocket)
    await manager.subscribe_symbols(websocket, await _default_symbols(user_id))

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "subscribe":
                symbols = data.get("symbols", [])
                await manager.subscribe_symbols(websocket, symbols)
            elif action == "ping":
                await websocket.send_json({"type": "pong", "payload": {}})
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        logger.exception("WebSocket error for user %s", user_id)
    finally:
        await manager.disconnect(user_id, websocket)
