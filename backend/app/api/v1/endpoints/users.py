from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
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
    updates = payload.model_dump(exclude_unset=True)

    # Email is the login identifier and is UNIQUE in the database, so it needs
    # checking before assignment — setting it blindly turns a duplicate into an
    # IntegrityError and a 500 rather than something the form can show.
    # Compared case-insensitively and stored lowercased, so the same address in
    # different case cannot be registered twice.
    new_email = updates.pop("email", None)
    if new_email is not None:
        new_email = new_email.strip().lower()
        if new_email != user.email.lower():
            taken = (await db.execute(
                select(User.id).where(func.lower(User.email) == new_email, User.id != user.id)
            )).first()
            if taken is not None:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail={"error": {"code": "EMAIL_TAKEN", "message": "That email address is already in use."}},
                )
            user.email = new_email

    # Blank the phone rather than storing an empty string, so "not set" is one
    # value (NULL) instead of two.
    if "phone" in updates:
        phone = (updates.pop("phone") or "").strip()
        user.phone = phone or None

    for field, value in updates.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
