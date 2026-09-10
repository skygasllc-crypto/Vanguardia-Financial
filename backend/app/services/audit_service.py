import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.enums import AuditActorType


async def record_audit(
    db: AsyncSession,
    actor_id: uuid.UUID | None,
    actor_type: AuditActorType,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    previous_data: dict | None = None,
    new_data: dict | None = None,
    reason: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        actor_type=actor_type,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        previous_data=previous_data,
        new_data=new_data,
        reason=reason,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    return entry
