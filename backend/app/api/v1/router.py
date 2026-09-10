from fastapi import APIRouter

from app.api.v1.endpoints import accounts, admin, auth, deposits, markets, orders, portfolio, positions, security, trades, users, wallet, watchlist, withdrawals

api_router = APIRouter()

api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(markets.router, prefix="/markets", tags=["Markets"])
api_router.include_router(positions.router, prefix="/positions", tags=["Positions"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(trades.router, prefix="/trades", tags=["Trades"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
api_router.include_router(deposits.router, prefix="/deposits", tags=["Deposits"])
api_router.include_router(security.router, prefix="/security", tags=["Security"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(withdrawals.router, prefix="/withdrawals", tags=["withdrawals"])
