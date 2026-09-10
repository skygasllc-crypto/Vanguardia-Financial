import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import RiskStatus, UserRole, UserStatus


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: uuid.UUID
    display_id: str  # User-facing ID (e.g., AB1234)
    email: EmailStr
    username: str
    full_name: str
    #: Optional, and returned so the profile form can show what is stored
    #: rather than presenting an empty box over an existing value.
    phone: str | None = None
    status: UserStatus
    role: UserRole
    risk_status: RiskStatus
    is_verified: bool
    two_factor_enabled: bool
    theme_preference: str
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class TwoFactorVerifyRequest(BaseModel):
    code: str
