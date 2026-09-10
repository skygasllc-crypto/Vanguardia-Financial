"""Shared enum types used across ORM models."""
import enum


class UserStatus(str, enum.Enum):
    """Lifecycle of a user account.

    The three non-active states differ in intent, not just in label:
    SUSPENDED is a temporary hold an admin expects to lift, DEACTIVATED is a
    dormant/closed account (usually housekeeping or a user request), and
    BANNED is punitive and permanent. All three deny sign-in and are rejected
    on every authenticated request; only the wording shown to the user and the
    admin's own audit trail distinguish them."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"
    BANNED = "banned"


#: Statuses that deny access. Kept in one place so the login path and the
#: per-request dependency can never drift out of sync.
BLOCKED_USER_STATUSES = (
    UserStatus.SUSPENDED,
    UserStatus.DEACTIVATED,
    UserStatus.BANNED,
)


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class RiskStatus(str, enum.Enum):
    NORMAL = "normal"
    WATCH = "watch"
    HIGH_RISK = "high_risk"


class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderType(str, enum.Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class PositionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class TransactionType(str, enum.Enum):
    TRADE_BUY = "TRADE_BUY"
    TRADE_SELL = "TRADE_SELL"
    POSITION_CLOSE = "POSITION_CLOSE"
    ADMIN_CREDIT = "ADMIN_CREDIT"
    ADMIN_DEBIT = "ADMIN_DEBIT"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"


class WithdrawalStatus(str, enum.Enum):
    """Lifecycle of a withdrawal request.

    Funds are held from the moment a request is raised, not when an admin gets
    to it — otherwise a user could request a withdrawal, trade the same money
    away while it sits in the queue, and leave the account negative when it is
    approved.
    """

    PENDING = "pending"        # raised, funds held, awaiting review
    APPROVED = "approved"      # admin approved, payment being sent
    COMPLETED = "completed"    # funds sent; the hold becomes a debit
    REJECTED = "rejected"      # admin declined; the hold is released
    CANCELLED = "cancelled"    # withdrawn by the user; the hold is released


class AdjustmentType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class AuditActorType(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"


class NotificationType(str, enum.Enum):
    SECURITY = "security"
    TRADE = "trade"
    SYSTEM = "system"
    ADMIN = "admin"


class DataSource(str, enum.Enum):
    """Marks whether a displayed figure is engine-computed or admin-overridden.

    Required by the platform's transparency rule: admin-entered values must
    never be presented as independently verified live market data.
    """

    ENGINE = "engine"
    ADMIN_MANAGED = "admin_managed"


class AccountType(str, enum.Enum):
    """Type of trading account."""

    DEMO = "demo"
    REAL = "real"


class DepositStatus(str, enum.Enum):
    """Status of cryptocurrency deposit transactions."""

    PENDING = "pending"
    USER_PAID = "user_paid"  # User clicked "I Paid" button, awaiting admin confirmation
    CONFIRMING = "confirming"
    CONFIRMED = "confirmed"
    CREDITED = "credited"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AssetType(str, enum.Enum):
    """Type of tradeable asset."""

    CRYPTO = "crypto"
    STOCK = "stock"
    FOREX = "forex"
    COMMODITY = "commodity"
