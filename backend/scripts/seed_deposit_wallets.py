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
        "wallet_address": "bc1q7q22zpcm2hvm8yl67q6nlx5vrr694sy3kh6d7z",
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
        "wallet_address": "TS8HF6N1KaNGeQJoVBfGfdshEKZLGreEwM",
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
        "wallet_address": "TS8HF6N1KaNGeQJoVBfGfdshEKZLGreEwM",
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


async def seed_deposit_wallets(db, overwrite: bool = False) -> None:
    """Insert any missing deposit wallets.

    Existing rows are left alone unless `overwrite` is set. This runs on every
    deploy, and these rows are editable by an admin at runtime
    (`PATCH /deposits/admin/wallets/{id}`) — rewriting them from the constants
    above on each deploy would silently revert an address an admin had
    corrected in production, and put the wire-transfer placeholder text back in
    front of users.

    Pass `--overwrite` deliberately, from a shell, to roll an address over
    from this file.
    """
    for wallet_data in DEPOSIT_WALLETS:
        existing = (
            await db.execute(select(DepositWallet).where(DepositWallet.currency_id == wallet_data["currency_id"]))
        ).scalar_one_or_none()

        if existing is None:
            db.add(DepositWallet(**wallet_data))
            print(f"added    {wallet_data['currency_symbol']} deposit wallet")
            continue

        if not overwrite:
            same = existing.wallet_address == wallet_data["wallet_address"]
            note = "" if same else "  (database differs from this file)"
            print(f"kept     {wallet_data['currency_symbol']} as configured in the database{note}")
            continue

        changed = existing.wallet_address != wallet_data["wallet_address"]
        for field, value in wallet_data.items():
            setattr(existing, field, value)
        print(f"{'overwrote' if changed else 'unchanged'} {wallet_data['currency_symbol']} deposit wallet")

    await db.commit()
    print(f"\n{len(DEPOSIT_WALLETS)} deposit wallets configured.")


async def main(overwrite: bool = False) -> None:
    async with AsyncSessionLocal() as db:
        await seed_deposit_wallets(db, overwrite=overwrite)


if __name__ == "__main__":
    import sys

    asyncio.run(main(overwrite="--overwrite" in sys.argv))
