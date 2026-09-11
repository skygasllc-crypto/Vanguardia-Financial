"""Seeds development data: tradeable assets with starting simulated prices,
and a demo admin + demo user account. Safe to re-run — skips rows that
already exist.

Usage: python -m scripts.seed
"""
import asyncio
import os
import secrets
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import AsyncSessionLocal
from app.models.account import Account
from app.models.asset import Asset
from app.models.enums import AccountType, UserRole, UserStatus
from app.models.market_price import MarketPrice
from app.models.user import User
from app.services.account_service import create_account

ASSETS = [
    {"symbol": "BTC", "name": "Bitcoin", "base_price": Decimal("98420.00"), "ath": Decimal("108135"), "atl": Decimal("67.81"), "supply": Decimal("19700000"), "trending": True},
    {"symbol": "ETH", "name": "Ethereum", "base_price": Decimal("3420.00"), "ath": Decimal("4878.26"), "atl": Decimal("0.43"), "supply": Decimal("120280000"), "trending": True},
    {"symbol": "SOL", "name": "Solana", "base_price": Decimal("220.00"), "ath": Decimal("259.96"), "atl": Decimal("0.50"), "supply": Decimal("467000000"), "trending": True},
    {"symbol": "XRP", "name": "XRP", "base_price": Decimal("2.10"), "ath": Decimal("3.40"), "atl": Decimal("0.0027"), "supply": Decimal("57000000000"), "trending": False},
    {"symbol": "USDT", "name": "Tether", "base_price": Decimal("1.00"), "ath": Decimal("1.32"), "atl": Decimal("0.57"), "supply": Decimal("120000000000"), "trending": False},
    {"symbol": "BNB", "name": "BNB", "base_price": Decimal("640.00"), "ath": Decimal("788.84"), "atl": Decimal("0.096"), "supply": Decimal("145000000"), "trending": False},
    {"symbol": "ADA", "name": "Cardano", "base_price": Decimal("0.92"), "ath": Decimal("3.10"), "atl": Decimal("0.017"), "supply": Decimal("35000000000"), "trending": False},
    {"symbol": "DOGE", "name": "Dogecoin", "base_price": Decimal("0.34"), "ath": Decimal("0.74"), "atl": Decimal("0.00008"), "supply": Decimal("146000000000"), "trending": False, "new": True},
    {"symbol": "AVAX", "name": "Avalanche", "base_price": Decimal("38.50"), "ath": Decimal("146.22"), "atl": Decimal("2.79"), "supply": Decimal("410000000"), "trending": False},
    {"symbol": "LINK", "name": "Chainlink", "base_price": Decimal("22.40"), "ath": Decimal("52.70"), "atl": Decimal("0.148"), "supply": Decimal("608000000"), "trending": False, "new": True},
]


async def seed_assets(db) -> None:
    for a in ASSETS:
        existing = (await db.execute(select(Asset).where(Asset.symbol == a["symbol"]))).scalar_one_or_none()
        if existing:
            continue
        asset = Asset(
            symbol=a["symbol"], name=a["name"], base_price=a["base_price"],
            circulating_supply=a["supply"], all_time_high=a["ath"], all_time_low=a["atl"],
            is_trending=a.get("trending", False), is_new_listing=a.get("new", False),
            description=f"{a['name']} ({a['symbol']}) — live market price, paper-trading execution.",
        )
        db.add(asset)
        await db.flush()

        db.add(MarketPrice(
            asset_id=asset.id, symbol=asset.symbol, current_price=asset.base_price,
            open_24h=asset.base_price, high_24h=asset.base_price, low_24h=asset.base_price,
            change_24h_pct=Decimal(0), volume_24h=asset.base_price * Decimal(1000),
            market_cap=asset.base_price * a["supply"],
        ))
    await db.commit()
    print(f"Seeded {len(ASSETS)} assets.")


def _seed_password(env_var: str) -> tuple[str, bool]:
    """The password to seed, and whether it had to be generated.

    Taken from the environment so this file never carries a working credential.
    It used to hardcode one, which is published with the repository and was
    therefore a live login to any deployment seeded from it. With nothing set,
    a random password is generated and printed once — recoverable only from
    that output, which is the right default for an account nobody has claimed.
    """
    supplied = os.environ.get(env_var, "").strip()
    if supplied:
        return supplied, False
    return secrets.token_urlsafe(18), True


async def seed_users(db) -> None:
    admin_email = os.environ.get("ADMIN_SEED_EMAIL", "admin@vanguardiafinancial.com").strip()
    existing_admin = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
    if existing_admin is None:
        admin_password, generated = _seed_password("ADMIN_SEED_PASSWORD")
        admin = User(
            email=admin_email, username="admin", password_hash=hash_password(admin_password),
            full_name="Platform Administrator", status=UserStatus.ACTIVE, role=UserRole.SUPER_ADMIN,
            is_verified=True,
        )
        db.add(admin)
        await db.flush()
        # Same two accounts every registered user gets, opened the same way so
        # the account number is allocated. Building the row here skipped that
        # and hit the NOT NULL constraint on `account_number`.
        await create_account(db, admin.id, AccountType.DEMO, initial_balance=Decimal(0))
        await create_account(db, admin.id, AccountType.REAL, initial_balance=Decimal(0))
        print(f"Seeded admin user: {admin_email}")
        if generated:
            print(f"  generated password (shown once, store it now): {admin_password}")
        else:
            print("  password taken from ADMIN_SEED_PASSWORD")

    demo_email = "demo@vanguardtrading.dev"
    existing_demo = (await db.execute(select(User).where(User.email == demo_email))).scalar_one_or_none()
    if existing_demo is None:
        demo_password, demo_generated = _seed_password("DEMO_SEED_PASSWORD")
        demo = User(
            email=demo_email, username="demo_investor", password_hash=hash_password(demo_password),
            full_name="Demo Investor", status=UserStatus.ACTIVE, role=UserRole.USER, is_verified=True,
        )
        db.add(demo)
        await db.flush()
        await create_account(db, demo.id, AccountType.DEMO)
        await create_account(db, demo.id, AccountType.REAL, initial_balance=Decimal(0))
        print(f"Seeded demo user: {demo_email}")
        if demo_generated:
            print(f"  generated password (shown once, store it now): {demo_password}")

    await db.commit()


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_assets(db)
        await seed_users(db)


if __name__ == "__main__":
    asyncio.run(main())
