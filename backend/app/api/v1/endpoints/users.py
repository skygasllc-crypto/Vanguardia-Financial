from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import UserPublic
from app.schemas.user import ProfileUpdate

router = APIRouter()


@router.get("/me", response_model=UserPublic)
async def get_my_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserPublic)
async def update_my_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
