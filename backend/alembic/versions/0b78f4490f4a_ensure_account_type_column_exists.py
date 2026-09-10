"""Ensure account_type column exists

Revision ID: 0b78f4490f4a
Revises: 3d5ac035bcc8
Create Date: 2026-09-06 23:37:02.250251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0b78f4490f4a'
down_revision: Union[str, None] = '3d5ac035bcc8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add account_type column to accounts, positions, orders tables
    op.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'demo'")
    op.execute("ALTER TABLE positions ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'demo'")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'demo'")


def downgrade() -> None:
    op.drop_column('orders', 'account_type')
    op.drop_column('positions', 'account_type')
    op.drop_column('accounts', 'account_type')
