"""Dev convenience: create all tables directly from the ORM metadata,
without going through Alembic. For anything beyond local development, use
`alembic upgrade head` instead so schema history stays tracked.

Usage: python -m scripts.init_db
"""
import asyncio

from app.database.base import Base
from app.database.session import engine
from app.models import *  # noqa: F401,F403


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")


if __name__ == "__main__":
    asyncio.run(main())
