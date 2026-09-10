"""Delete extra deposit wallets, keeping only 4."""
import asyncio
from sqlalchemy import select, delete
from app.database.session import AsyncSessionLocal
from app.models.deposit_wallet import DepositWallet

# Keep only these 4 currencies
KEEP_CURRENCIES = ['bitcoin', 'ethereum', 'tether-erc20', 'usd-coin-erc20']


async def cleanup_wallets():
    async with AsyncSessionLocal() as db:
        # Get all wallets
        result = await db.execute(select(DepositWallet))
        all_wallets = result.scalars().all()

        print(f"Found {len(all_wallets)} payment methods")

        # Find wallets to delete
        to_delete = [w for w in all_wallets if w.currency_id not in KEEP_CURRENCIES]
        to_keep = [w for w in all_wallets if w.currency_id in KEEP_CURRENCIES]

        print(f"\nKeeping {len(to_keep)} payment methods:")
        for w in to_keep:
            print(f"  ✓ {w.currency_symbol} - {w.currency_name}")

        print(f"\nDeleting {len(to_delete)} payment methods:")
        for w in to_delete:
            print(f"  ✗ {w.currency_symbol} - {w.currency_name}")
            await db.delete(w)

        await db.commit()
        print(f"\n✅ Done! Now have {len(to_keep)} payment methods.")


if __name__ == "__main__":
    asyncio.run(cleanup_wallets())
