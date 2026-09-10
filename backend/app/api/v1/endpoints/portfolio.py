import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.portfolio import PortfolioSummary
from app.services.account_service import AccountNotFoundError
from app.services.portfolio_service import build_portfolio_summary

router = APIRouter()


@router.get("", response_model=PortfolioSummary)
async def get_portfolio(
    account_id: uuid.UUID | None = None,
    account_type: str = "demo",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # An account_id that is unknown, or belongs to somebody else, is a bad
    # request from this user's point of view — not a server fault.
    try:
        return await build_portfolio_summary(db, user.id, account_type, account_id)
    except AccountNotFoundError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "ACCOUNT_NOT_FOUND", "message": "Account not found."}},
        ) from exc
