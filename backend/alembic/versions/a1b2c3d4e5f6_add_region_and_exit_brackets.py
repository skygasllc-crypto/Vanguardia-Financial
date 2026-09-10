"""add asset region/exchange and take-profit / stop-loss brackets

Revision ID: a1b2c3d4e5f6
Revises: d49dee8fa71b
Create Date: 2026-09-09

Adds the two pieces of schema the expanded asset universe needs:

* `assets.region` / `assets.exchange` — so equities can be grouped by listing
  market (US vs China), which the markets and trade screens filter on.
* `orders.take_profit_price` / `stop_loss_price` and the matching pair on
  `positions` — the protective exits captured at order entry and carried onto
  the position, so closed-trade history can report the brackets a trade ran
  under. All four are nullable: existing rows predate the feature and have no
  brackets to backfill.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd49dee8fa71b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assets', sa.Column('region', sa.String(length=40), nullable=True))
    op.add_column('assets', sa.Column('exchange', sa.String(length=40), nullable=True))
    op.create_index(op.f('ix_assets_region'), 'assets', ['region'], unique=False)

    for table in ('orders', 'positions'):
        op.add_column(table, sa.Column('take_profit_price', sa.Numeric(24, 8), nullable=True))
        op.add_column(table, sa.Column('stop_loss_price', sa.Numeric(24, 8), nullable=True))


def downgrade() -> None:
    for table in ('orders', 'positions'):
        op.drop_column(table, 'stop_loss_price')
        op.drop_column(table, 'take_profit_price')

    op.drop_index(op.f('ix_assets_region'), table_name='assets')
    op.drop_column('assets', 'exchange')
    op.drop_column('assets', 'region')
