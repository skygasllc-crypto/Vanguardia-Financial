"""Shared FastAPI dependencies: current user, admin guard, rate limiting."""
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.database.session import get_db
from app.models.enums import BLOCKED_USER_STATUSES, UserRole, UserStatus
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"error": {"code": code, "message": message}})


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "NOT_AUTHENTICATED", "Authentication required.")
    try:
        payload = decode_token(token)
    except ValueError:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token.")

    if payload.get("type") != "access":
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN_TYPE", "An access token is required.")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid token subject.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "USER_NOT_FOUND", "User no longer exists.")
    if user.status in BLOCKED_USER_STATUSES:
        raise AppError(status.HTTP_403_FORBIDDEN, "ACCOUNT_DISABLED", "This account is disabled.")
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise AppError(status.HTTP_403_FORBIDDEN, "ADMIN_REQUIRED", "Administrator privileges required.")
    return user


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
