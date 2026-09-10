import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.enums import AccountType
from app.models.order import Order
from app.models.user import User
from app.schemas.trading import OrderCreate, OrderOut
from app.services.account_service import AccountNotFoundError
from app.services.trading_service import TradingError, cancel_order, place_order

router = APIRouter()


@router.get("", response_model=list[OrderOut])
async def list_orders(
    account_type: str | None = Query(default=None, pattern="^(demo|real)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Orders for the requested book. Omitting the filter returns both, which
    is only right for an audit view — the trading UI always passes the account
    the user is currently on, or a real account would list demo orders."""
    query = select(Order).where(Order.user_id == user.id)
    if account_type:
        query = query.where(Order.account_type == AccountType(account_type))
    return (await db.execute(query.order_by(Order.created_at.desc()))).scalars().all()


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        order, _trade, _position = await place_order(db, user, payload)
    except AccountNotFoundError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}},
        ) from exc
    except TradingError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "ORDER_FAILED", "message": str(exc)}})
    return order


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order_endpoint(order_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await cancel_order(db, user, order_id)
    except TradingError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "CANCEL_FAILED", "message": str(exc)}})
