import uuid

import pyotp
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.database.session import get_db
from app.models.enums import AuditActorType
from app.models.login_history import LoginHistory
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import ChangePasswordRequest, TwoFactorSetupResponse, TwoFactorVerifyRequest
from app.schemas.security import LoginHistoryOut, SessionOut
from app.services.audit_service import record_audit

router = APIRouter()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "INVALID_PASSWORD", "message": "Current password is incorrect."}})
    user.password_hash = hash_password(payload.new_password)
    await record_audit(db, actor_id=user.id, actor_type=AuditActorType.USER, action="PASSWORD_CHANGED", resource_type="user", resource_id=user.id)
    await db.commit()


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_two_factor(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    secret = pyotp.random_base32()
    user.two_factor_secret = secret
    await db.commit()
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=settings.APP_NAME)
    return TwoFactorSetupResponse(secret=secret, otpauth_url=otpauth_url)


@router.post("/2fa/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_two_factor(payload: TwoFactorVerifyRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.two_factor_secret or not pyotp.TOTP(user.two_factor_secret).verify(payload.code, valid_window=1):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "INVALID_2FA_CODE", "message": "Invalid verification code."}})
    user.two_factor_enabled = True
    await record_audit(db, actor_id=user.id, actor_type=AuditActorType.USER, action="2FA_ENABLED", resource_type="user", resource_id=user.id)
    await db.commit()


@router.post("/2fa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def disable_two_factor(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.two_factor_enabled = False
    user.two_factor_secret = None
    await record_audit(db, actor_id=user.id, actor_type=AuditActorType.USER, action="2FA_DISABLED", resource_type="user", resource_id=user.id)
    await db.commit()


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserSession).where(UserSession.user_id == user.id, UserSession.is_active == True).order_by(UserSession.last_active_at.desc())  # noqa: E712
    )
    return result.scalars().all()


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(session_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await db.get(UserSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"error": {"code": "SESSION_NOT_FOUND", "message": "Session not found."}})
    session.is_active = False
    await record_audit(db, actor_id=user.id, actor_type=AuditActorType.USER, action="SESSION_REVOKED", resource_type="user_session", resource_id=session.id)
    await db.commit()


@router.get("/login-history", response_model=list[LoginHistoryOut])
async def get_login_history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(LoginHistory).where(LoginHistory.user_id == user.id).order_by(LoginHistory.created_at.desc()).limit(50)
    return (await db.execute(query)).scalars().all()
