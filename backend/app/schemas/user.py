from pydantic import BaseModel, EmailStr


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    theme_preference: str | None = None
    notification_preferences: dict | None = None
