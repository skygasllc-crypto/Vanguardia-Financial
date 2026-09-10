import asyncio
from sqlalchemy import text
from app.database.session import engine

async def check():
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'deposit%' ORDER BY table_name"
        ))
        tables = [r[0] for r in result.fetchall()]
        print(f"Deposit tables found: {tables}")

asyncio.run(check())
