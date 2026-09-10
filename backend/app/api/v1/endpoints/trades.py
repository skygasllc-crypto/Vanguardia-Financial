from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.enums import AccountType
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trading import TradeOut

router = APIRouter()


@router.get("", response_model=list[TradeOut])
async def list_trades(
    account_type: str | None = Query(default=None, pattern="^(demo|real)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executions for the requested book. A Trade carries no account type of
    its own — it inherits the one on the position it belongs to, so the filter
    joins through it."""
    query = select(Trade).where(Trade.user_id == user.id)
    if account_type:
        query = query.join(Position, Position.id == Trade.position_id).where(
            Position.account_type == AccountType(account_type)
        )
    return (await db.execute(query.order_by(Trade.executed_at.desc()))).scalars().all()
