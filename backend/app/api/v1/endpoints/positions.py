import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.enums import AccountType, PositionStatus
from app.models.position import Position
from app.models.user import User
from app.schemas.trading import PositionOut
from app.services.trading_service import TradingError, close_position_at_market

router = APIRouter()


@router.get("", response_model=list[PositionOut])
async def list_positions(
    status_filter: str | None = Query(default=None, pattern="^(open|closed)$"),
    account_type: str | None = Query(default=None, pattern="^(demo|real)$"),
    limit: int = Query(default=200, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open positions by default-ish: passing no filter returns both states, so
    the closed-trade history can read from the same endpoint. Closed rows are
    ordered by when they closed, open rows by when they opened."""
    query = select(Position).where(Position.user_id == user.id)
    if account_type:
        query = query.where(Position.account_type == AccountType(account_type))
    if status_filter:
        query = query.where(Position.status == PositionStatus(status_filter))
    query = query.order_by(
        func.coalesce(Position.closed_at, Position.opened_at).desc()
    ).limit(limit)
    return (await db.execute(query)).scalars().all()


@router.get("/{position_id}", response_model=PositionOut)
async def get_position(position_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    position = await db.get(Position, position_id)
    if position is None or position.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "POSITION_NOT_FOUND", "message": "Position not found."}})
    return position


@router.post("/{position_id}/close", response_model=PositionOut)
async def close_position(position_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await close_position_at_market(db, user, position_id)
    except TradingError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "CLOSE_POSITION_FAILED", "message": str(exc)}})
