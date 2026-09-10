from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_client_ip, get_current_user
from app.core.rate_limit import limiter
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserPublic
from app.services.auth_service import AuthError, authenticate_user, issue_session_tokens, register_user, rotate_refresh_token

router = APIRouter()


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await register_user(db, payload)
    except AuthError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"error": {"code": "USER_EXISTS", "message": str(exc)}})
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    try:
        user = await authenticate_user(db, payload.email, payload.password, ip, user_agent)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"error": {"code": "INVALID_CREDENTIALS", "message": str(exc)}})

    access_token, refresh_token = await issue_session_tokens(db, user, ip, user_agent)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        access_token, refresh_token = await rotate_refresh_token(db, payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"error": {"code": "INVALID_REFRESH_TOKEN", "message": str(exc)}})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return user
