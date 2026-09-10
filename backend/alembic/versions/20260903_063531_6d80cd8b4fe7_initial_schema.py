"""initial schema

Revision ID: 6d80cd8b4fe7
Revises:
Create Date: 2026-09-03 06:35:31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "6d80cd8b4fe7"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("risk_status", sa.String(20), nullable=False),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("two_factor_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("two_factor_secret", sa.String(64), nullable=True),
        sa.Column("theme_preference", sa.String(20), nullable=False, server_default="dark"),
        sa.Column("notification_preferences", sa.JSON, nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("available_balance", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("locked_balance", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "currency", name="uq_account_user_currency"),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_trending", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("is_new_listing", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("base_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("circulating_supply", sa.Numeric(28, 2), nullable=False, server_default="0"),
        sa.Column("all_time_high", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("all_time_low", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("symbol", name="uq_assets_symbol"),
    )
    op.create_index("ix_assets_symbol", "assets", ["symbol"])

    op.create_table(
        "market_prices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("current_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("open_24h", sa.Numeric(24, 8), nullable=False),
        sa.Column("high_24h", sa.Numeric(24, 8), nullable=False),
        sa.Column("low_24h", sa.Numeric(24, 8), nullable=False),
        sa.Column("change_24h_pct", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("volume_24h", sa.Numeric(28, 2), nullable=False, server_default="0"),
        sa.Column("market_cap", sa.Numeric(28, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("asset_id", name="uq_market_prices_asset_id"),
    )
    op.create_index("ix_market_prices_symbol", "market_prices", ["symbol"])

    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 8), nullable=False),
        sa.Column("average_entry_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("total_cost_basis", sa.Numeric(24, 8), nullable=False),
        sa.Column("current_market_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("current_market_value", sa.Numeric(24, 8), nullable=False),
        sa.Column("unrealized_profit_loss", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("unrealized_profit_loss_pct", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closing_price", sa.Numeric(24, 8), nullable=True),
        sa.Column("realized_profit_loss", sa.Numeric(24, 8), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_positions_user_id", "positions", ["user_id"])
    op.create_index("ix_positions_asset_id", "positions", ["asset_id"])
    op.create_index("ix_positions_symbol", "positions", ["symbol"])
    op.create_index("ix_positions_status", "positions", ["status"])

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("order_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 8), nullable=False),
        sa.Column("price", sa.Numeric(24, 8), nullable=True),
        sa.Column("stop_price", sa.Numeric(24, 8), nullable=True),
        sa.Column("filled_price", sa.Numeric(24, 8), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_symbol", "orders", ["symbol"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("position_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("positions.id"), nullable=True),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 8), nullable=False),
        sa.Column("execution_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("total_value", sa.Numeric(24, 8), nullable=False),
        sa.Column("realized_profit_loss", sa.Numeric(24, 8), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trades_user_id", "trades", ["user_id"])
    op.create_index("ix_trades_order_id", "trades", ["order_id"])
    op.create_index("ix_trades_position_id", "trades", ["position_id"])
    op.create_index("ix_trades_symbol", "trades", ["symbol"])

    op.create_table(
        "transaction_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("transaction_ref", sa.String(64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("transaction_type", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("balance_before", sa.Numeric(20, 2), nullable=False),
        sa.Column("balance_after", sa.Numeric(20, 2), nullable=False),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("transaction_ref", name="uq_transaction_ledger_ref"),
    )
    op.create_index("ix_transaction_ledger_user_id", "transaction_ledger", ["user_id"])
    op.create_index("ix_transaction_ledger_account_id", "transaction_ledger", ["account_id"])
    op.create_index("ix_transaction_ledger_type", "transaction_ledger", ["transaction_type"])
    op.create_index("ix_transaction_ledger_created_at", "transaction_ledger", ["created_at"])

    op.create_table(
        "admin_adjustments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transaction_ledger.id"), nullable=False),
        sa.Column("adjustment_type", sa.String(10), nullable=False),
        sa.Column("amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("internal_reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_admin_adjustments_admin_id", "admin_adjustments", ["admin_id"])
    op.create_index("ix_admin_adjustments_user_id", "admin_adjustments", ["user_id"])
    op.create_index("ix_admin_adjustments_transaction_id", "admin_adjustments", ["transaction_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_type", sa.String(10), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("previous_data", postgresql.JSONB, nullable=True),
        sa.Column("new_data", postgresql.JSONB, nullable=True),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "asset_id", name="uq_watchlist_user_asset"),
    )
    op.create_index("ix_watchlist_items_user_id", "watchlist_items", ["user_id"])
    op.create_index("ix_watchlist_items_asset_id", "watchlist_items", ["asset_id"])

    op.create_table(
        "user_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("refresh_token_jti", sa.String(64), nullable=False),
        sa.Column("device_name", sa.String(200), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("refresh_token_jti", name="uq_user_sessions_jti"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])

    op.create_table(
        "login_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("success", sa.Boolean, nullable=False),
        sa.Column("failure_reason", sa.String(200), nullable=True),
        sa.Column("is_suspicious", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_login_history_user_id", "login_history", ["user_id"])
    op.create_index("ix_login_history_created_at", "login_history", ["created_at"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.String(1000), nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "user_financial_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("total_account_balance", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("available_balance", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("portfolio_value", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("total_profit", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("total_loss", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("net_profit_loss", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("total_invested_amount", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("daily_profit_loss", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("profit_loss_percentage", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("updated_by_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_user_financial_settings_user"),
    )
    op.create_index("ix_user_financial_settings_user_id", "user_financial_settings", ["user_id"])

    op.create_table(
        "admin_positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("asset_name", sa.String(100), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 8), nullable=False),
        sa.Column("entry_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("admin_current_price", sa.Numeric(24, 8), nullable=False),
        sa.Column("invested_amount", sa.Numeric(24, 8), nullable=False),
        sa.Column("admin_current_value", sa.Numeric(24, 8), nullable=False),
        sa.Column("admin_profit_loss", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("admin_profit_loss_pct", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("position_status", sa.String(20), nullable=False),
        sa.Column("created_by_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_by_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_admin_positions_user_id", "admin_positions", ["user_id"])
    op.create_index("ix_admin_positions_symbol", "admin_positions", ["symbol"])


def downgrade() -> None:
    op.drop_table("admin_positions")
    op.drop_table("user_financial_settings")
    op.drop_table("notifications")
    op.drop_table("login_history")
    op.drop_table("user_sessions")
    op.drop_table("watchlist_items")
    op.drop_table("audit_logs")
    op.drop_table("admin_adjustments")
    op.drop_table("transaction_ledger")
    op.drop_table("trades")
    op.drop_table("orders")
    op.drop_table("positions")
    op.drop_table("market_prices")
    op.drop_table("assets")
    op.drop_table("accounts")
    op.drop_table("users")
