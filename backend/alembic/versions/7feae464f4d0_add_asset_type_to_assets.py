"""add_asset_type_to_assets

Revision ID: 7feae464f4d0
Revises: cdf379ef5c0f
Create Date: 2026-09-08 12:47:13.733712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7feae464f4d0'
down_revision: Union[str, None] = 'cdf379ef5c0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create asset_type enum with uppercase values
    asset_type_enum = sa.Enum('CRYPTO', 'STOCK', 'FOREX', 'COMMODITY', name='assettype')
    asset_type_enum.create(op.get_bind(), checkfirst=True)

    # Add asset_type column with default value 'CRYPTO'
    op.add_column('assets', sa.Column('asset_type', asset_type_enum, nullable=False, server_default='CRYPTO'))
    op.create_index(op.f('ix_assets_asset_type'), 'assets', ['asset_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_assets_asset_type'), table_name='assets')
    op.drop_column('assets', 'asset_type')
    sa.Enum(name='assettype').drop(op.get_bind(), checkfirst=True)
