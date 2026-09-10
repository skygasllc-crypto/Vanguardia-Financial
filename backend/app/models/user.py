import random
import string
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.database.enum_type import pg_enum
from app.models.enums import RiskStatus, UserRole, UserStatus


def generate_user_id() -> str:
    """Generate user ID: 2 uppercase letters + 4 random digits (e.g., AB1234)"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    digits = ''.join(random.choices(string.digits, k=4))
    return letters + digits

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.deposit import Deposit
    from app.models.notification import Notification
    from app.models.order import Order
    from app.models.position import Position
    from app.models.user_session import UserSession
    from app.models.watchlist import WatchlistItem


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    display_id: Mapped[str] = mapped_column(String(6), unique=True, index=True, nullable=False, default=generate_user_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    status: Mapped[UserStatus] = mapped_column(
        pg_enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False
    )
    role: Mapped[UserRole] = mapped_column(pg_enum(UserRole), default=UserRole.USER, nullable=False)
    risk_status: Mapped[RiskStatus] = mapped_column(pg_enum(RiskStatus), default=RiskStatus.NORMAL, nullable=False)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)

    theme_preference: Mapped[str] = mapped_column(String(20), default="dark", nullable=False)
    notification_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    accounts: Mapped[list["Account"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    positions: Mapped[list["Position"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["UserSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    watchlist_items: Mapped[list["WatchlistItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    # deposits: Mapped[list["Deposit"]] = relationship(back_populates="user", cascade="all, delete-orphan")  # Temporarily disabled - circular import issue

    def __repr__(self) -> str:
        return f"<User {self.username}>"
