"""Seeds sample deposit wallet addresses. Admin should update these with real addresses."""
import asyncio

from sqlalchemy import select

from app.database.session import AsyncSessionLocal
from app.models.deposit import Deposit  # noqa: F401 - Import to register model
from app.models.deposit_wallet import DepositWallet

# Sample deposit wallets and payment methods (Admin should replace these with REAL details)
DEPOSIT_WALLETS = [
    {
        "currency_id": "btc",
        "currency_name": "Bitcoin (BTC)",
        "currency_symbol": "BTC",
        "network": "Bitcoin",
        "network_fee": "0.0005 BTC",
        "icon": "₿",
        "wallet_address": "bc1qm9dcm0rn4uk7gxauc79gjqna9zf9ly4cvheeku",
        "minimum_deposit": "0.001 BTC",
        "notes": "Bitcoin mainnet deposit address",
    },
    {
        "currency_id": "usdt-trc20",
        "currency_name": "Tether USDT (TRC-20)",
        "currency_symbol": "USDT",
        "network": "Tron",
        "network_fee": "1 USDT",
        "icon": "₮",
        "wallet_address": "REPLACE_WITH_REAL_TRC20_ADDRESS",
        "minimum_deposit": "10 USDT",
        "notes": "USDT on Tron network",
    },
    {
        "currency_id": "trx",
        "currency_name": "Tron (TRX)",
        "currency_symbol": "TRX",
        "network": "Tron",
        "network_fee": "1 TRX",
        "icon": "T",
        "wallet_address": "REPLACE_WITH_REAL_TRX_ADDRESS",
        "minimum_deposit": "10 TRX",
        "notes": "Tron mainnet deposit address",
    },
    {
        "currency_id": "wire-transfer",
        "currency_name": "Wire Transfer",
        "currency_symbol": "USD",
        "network": "Bank Transfer",
        "network_fee": "$25 USD",
        "icon": "🏦",
        "wallet_address": "Bank: Example Bank | Account: REPLACE_WITH_REAL_ACCOUNT | Routing: REPLACE_WITH_ROUTING",
        "minimum_deposit": "$1,000 USD",
        "notes": "Wire transfer - contact support for detailed instructions",
    },
]


async def seed_deposit_wallets(db) -> None:
    """Seed deposit wallet addresses."""
    for wallet_data in DEPOSIT_WALLETS:
        # Check if wallet already exists
        existing = await db.execute(select(DepositWallet).where(DepositWallet.currency_id == wallet_data["currency_id"]))
        if existing.scalar_one_or_none():
            print(f"⏭️  Skipping {wallet_data['currency_symbol']} - already exists")
            continue

        wallet = DepositWallet(**wallet_data)
        db.add(wallet)
        print(f"✅ Added {wallet_data['currency_symbol']} deposit wallet")

    await db.commit()
    print(f"\n✅ Seeded {len(DEPOSIT_WALLETS)} deposit wallets")
    print("\n⚠️  WARNING: These are PLACEHOLDER addresses!")
    print("   Admin must update these with REAL wallet addresses via the admin panel.")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_deposit_wallets(db)


if __name__ == "__main__":
    asyncio.run(main())
