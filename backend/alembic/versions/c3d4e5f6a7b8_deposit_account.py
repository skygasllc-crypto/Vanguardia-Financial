"""deposits target a specific account

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-10

A user can now hold several accounts, so a deposit has to say which one it
funds. Existing deposits are pointed at the depositor's primary real account,
which is where they were credited before the column existed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('deposits', sa.Column('account_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_deposits_account_id', 'deposits', 'accounts', ['account_id'], ['id'])
    op.create_index(op.f('ix_deposits_account_id'), 'deposits', ['account_id'])
    op.execute("""
        UPDATE deposits d SET account_id = a.id
        FROM accounts a
        WHERE a.user_id = d.user_id AND a.account_type = 'real' AND a.is_primary = true
          AND d.account_id IS NULL
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_deposits_account_id'), table_name='deposits')
    op.drop_constraint('fk_deposits_account_id', 'deposits', type_='foreignkey')
    op.drop_column('deposits', 'account_id')
