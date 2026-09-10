import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models.account import Account
from app.models.enums import AccountType, AuditActorType, BLOCKED_USER_STATUSES, UserStatus
from app.models.login_history import LoginHistory
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import RegisterRequest
from app.services.account_service import create_account
from app.services.audit_service import record_audit


class AuthError(Exception):
    pass


async def register_user(db: AsyncSession, payload: RegisterRequest) -> User:
    existing = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if existing.scalar_one_or_none() is not None:
        raise AuthError("An account with this email or username already exists.")

    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        status=UserStatus.PENDING_VERIFICATION,
    )
    db.add(user)
    await db.flush()

    # Opened through `create_account` rather than built here, so a new user's
    # accounts are identical to any opened later: it allocates the unique
    # `account_number` (NOT NULL since multi-account) and marks the first of
    # each type primary. Building the rows inline skipped both, and every
    # registration failed on the not-null constraint.
    #
    # Balances still come out as before — create_account funds a USD demo
    # account with the practice balance and opens a real account at zero.
    await create_account(db, user.id, AccountType.DEMO)
    await create_account(db, user.id, AccountType.REAL)

    await record_audit(
        db, actor_id=user.id, actor_type=AuditActorType.USER, action="USER_REGISTERED",
        resource_type="user", resource_id=user.id,
        new_data={"email": user.email, "username": user.username},
    )
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str, ip_address: str | None, user_agent: str | None
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    success = user is not None and verify_password(password, user.password_hash)
    failure_reason = None
    if user is None:
        failure_reason = "Account not found"
    elif not success:
        failure_reason = "Invalid password"
    elif user.status in BLOCKED_USER_STATUSES:
        success = False
        failure_reason = f"Account is {user.status.value}"

    # Only log login attempts if user exists (to avoid FK constraint violation)
    if user is not None:
        db.add(LoginHistory(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=bool(success),
            failure_reason=failure_reason,
        ))

    if not success or user is None:
        await db.commit()
        raise AuthError("Invalid email or password.")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def issue_session_tokens(
    db: AsyncSession, user: User, ip_address: str | None, user_agent: str | None, device_name: str | None = None
) -> tuple[str, str]:
    access_token = create_access_token(str(user.id), {"role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))
    payload = decode_token(refresh_token)

    session = UserSession(
        user_id=user.id,
        refresh_token_jti=payload["jti"],
        device_name=device_name,
        user_agent=user_agent,
        ip_address=ip_address,
        is_active=True,
        last_active_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()
    return access_token, refresh_token


async def rotate_refresh_token(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    try:
        payload = decode_token(refresh_token)
    except ValueError:
        raise AuthError("Invalid or expired refresh token.")

    if payload.get("type") != "refresh":
        raise AuthError("A refresh token is required.")

    result = await db.execute(
        select(UserSession).where(UserSession.refresh_token_jti == payload["jti"], UserSession.is_active == True)  # noqa: E712
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise AuthError("Session not found or has been revoked.")

    user = await db.get(User, session.user_id)
    if user is None:
        raise AuthError("User no longer exists.")

    session.is_active = False
    await db.flush()

    access_token, new_refresh_token = await issue_session_tokens(
        db, user, session.ip_address, session.user_agent, session.device_name
    )
    return access_token, new_refresh_token
