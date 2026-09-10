"""Import every model so `Base.metadata` is fully populated for Alembic."""
from app.models.user import User  # Import User first as other models reference it
from app.models.account import Account
from app.models.admin_adjustment import AdminAdjustment
from app.models.admin_position import AdminPosition
from app.models.asset import Asset
from app.models.audit_log import AuditLog
from app.models.equity_snapshot import EquitySnapshot  # noqa: F401
from app.models.deposit import Deposit
from app.models.deposit_wallet import DepositWallet
from app.models.login_history import LoginHistory
from app.models.market_price import MarketPrice
from app.models.notification import Notification
from app.models.order import Order
from app.models.position import Position
from app.models.trade import Trade
from app.models.transaction_ledger import TransactionLedger
from app.models.user_financial_settings import UserFinancialSettings
from app.models.user_session import UserSession
from app.models.watchlist import WatchlistItem

__all__ = [
    "Account",
    "AdminAdjustment",
    "AdminPosition",
    "Asset",
    "AuditLog",
    "Deposit",
    "DepositWallet",
    "LoginHistory",
    "MarketPrice",
    "Notification",
    "Order",
    "Position",
    "Trade",
    "TransactionLedger",
    "User",
    "UserFinancialSettings",
    "UserSession",
    "WatchlistItem",
]
from app.models.withdrawal import Withdrawal  # noqa: F401
