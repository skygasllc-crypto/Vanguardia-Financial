"""Create missing DEMO and REAL accounts for existing users."""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import AsyncSessionLocal
from app.models.account import Account
from app.models.enums import AccountType
from app.models.user import User
from app.services.account_service import create_account


async def create_missing_accounts():
    """Ensure every user has both DEMO and REAL accounts."""
    async with AsyncSessionLocal() as db:
        # Get all users
        result = await db.execute(select(User))
        users = result.scalars().all()

        for user in users:
            print(f"Processing user: {user.email} (ID: {user.id})")

            # Check for DEMO account
            demo_result = await db.execute(
                select(Account).where(
                    Account.user_id == user.id,
                    Account.account_type == AccountType.DEMO
                )
            )
            demo_account = demo_result.scalar_one_or_none()

            if demo_account is None:
                print(f"  Creating DEMO account for {user.email}")
                # `create_account` allocates the account number; building the
                # row here left it null, which the column forbids.
                demo_account = await create_account(db, user.id, AccountType.DEMO)
            else:
                print(f"  DEMO account exists for {user.email}")

            # Check for REAL account
            real_result = await db.execute(
                select(Account).where(
                    Account.user_id == user.id,
                    Account.account_type == AccountType.REAL
                )
            )
            real_account = real_result.scalar_one_or_none()

            if real_account is None:
                print(f"  Creating REAL account for {user.email}")
                real_account = await create_account(db, user.id, AccountType.REAL)
            else:
                print(f"  REAL account exists for {user.email}")

        await db.commit()
        print("\nDone! All users now have both DEMO and REAL accounts.")


if __name__ == "__main__":
    asyncio.run(create_missing_accounts())
