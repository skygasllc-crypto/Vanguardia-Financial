from pydantic import BaseModel, EmailStr


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    #: Changing this changes the address the user signs in with — there is no
    #: confirmation step, because the platform sends no mail. The endpoint
    #: rejects an address already registered to someone else.
    email: EmailStr | None = None
    phone: str | None = None
    theme_preference: str | None = None
    notification_preferences: dict | None = None
