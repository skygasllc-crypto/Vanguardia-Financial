"""Shared helper for enum-typed columns.

By default, SQLAlchemy maps a `Mapped[SomeEnum]` annotation to a native
PostgreSQL `ENUM` type keyed on the Python member *name*, which requires a
`CREATE TYPE` in every migration and stores values like `"PENDING_VERIFICATION"`.
This project instead stores enums as plain `VARCHAR` columns holding the
member's `.value` (e.g. `"pending_verification"`) — the same casing already
used by the Pydantic schemas and the frontend — so every enum column should
be declared with this helper instead of a bare `sa.Enum(...)`.
"""
from typing import Type

from sqlalchemy import Enum as SAEnum


def pg_enum(enum_cls: Type, length: int = 32) -> SAEnum:
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=length,
        values_callable=lambda obj: [member.value for member in obj],
    )
