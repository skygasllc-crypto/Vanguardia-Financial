import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionOut(BaseModel):
    id: uuid.UUID
    device_name: str | None
    user_agent: str | None
    ip_address: str | None
    is_active: bool
    last_active_at: datetime | None
    created_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class LoginHistoryOut(BaseModel):
    id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    success: bool
    failure_reason: str | None
    is_suspicious: bool
    created_at: datetime

    model_config = {"from_attributes": True}
