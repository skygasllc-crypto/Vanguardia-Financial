"""pin a position at an admin-set price

An admin editing a position's P&L set its current price, but the market engine
rewrote every open position's price on its next tick, so the change vanished
within seconds and never reached the user's screen for long. The admin's price
is now held in `admin_price_override`; while it is set, the engine leaves the
position alone and the position is valued and closed at that price.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('positions', sa.Column('admin_price_override', sa.Numeric(24, 8), nullable=True))


def downgrade() -> None:
    op.drop_column('positions', 'admin_price_override')
