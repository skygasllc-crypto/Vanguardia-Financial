"""Deposit wallet address model for managing admin cryptocurrency deposit addresses."""
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DepositWallet(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin-managed cryptocurrency deposit addresses."""

    __tablename__ = "deposit_wallets"

    # Cryptocurrency details
    currency_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    currency_name: Mapped[str] = mapped_column(String(100), nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    network: Mapped[str] = mapped_column(String(50), nullable=False)
    network_fee: Mapped[str] = mapped_column(String(50), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False)

    # Deposit address
    wallet_address: Mapped[str] = mapped_column(String(255), nullable=False)
    memo_tag: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Configuration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    minimum_deposit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<DepositWallet {self.currency_symbol} on {self.network}>"
