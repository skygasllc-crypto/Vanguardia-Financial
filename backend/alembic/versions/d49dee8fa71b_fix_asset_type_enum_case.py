"""fix_asset_type_enum_case

Revision ID: d49dee8fa71b
Revises: 7feae464f4d0
Create Date: 2026-09-08 14:37:46.677226

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd49dee8fa71b'
down_revision: Union[str, None] = '7feae464f4d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL enum values are immutable - need to recreate the type
    # First, drop the default value and alter the column to text
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type DROP DEFAULT")
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type TYPE VARCHAR USING asset_type::text")

    # Drop the old enum type
    op.execute("DROP TYPE assettype")

    # Create new enum with uppercase values
    op.execute("CREATE TYPE assettype AS ENUM ('CRYPTO', 'STOCK', 'FOREX', 'COMMODITY')")

    # Update the text values to uppercase
    op.execute("UPDATE assets SET asset_type = UPPER(asset_type)")

    # Convert the column back to the enum type and set default
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type TYPE assettype USING asset_type::assettype")
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type SET DEFAULT 'CRYPTO'")


def downgrade() -> None:
    # Revert to lowercase
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type DROP DEFAULT")
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type TYPE VARCHAR USING asset_type::text")
    op.execute("DROP TYPE assettype")
    op.execute("CREATE TYPE assettype AS ENUM ('crypto', 'stock', 'forex', 'commodity')")
    op.execute("UPDATE assets SET asset_type = LOWER(asset_type)")
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type TYPE assettype USING asset_type::assettype")
    op.execute("ALTER TABLE assets ALTER COLUMN asset_type SET DEFAULT 'crypto'")
