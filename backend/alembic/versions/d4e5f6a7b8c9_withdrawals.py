"""withdrawal requests

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'withdrawals',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('accounts.id'), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('fee', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('method', sa.String(40), nullable=False),
        sa.Column('destination', sa.String(500), nullable=False),
        sa.Column('destination_memo', sa.String(120), nullable=True),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('user_note', sa.String(500), nullable=True),
        sa.Column('admin_note', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('reviewed_by', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('transaction_reference', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_withdrawals_user_id', 'withdrawals', ['user_id'])
    op.create_index('ix_withdrawals_account_id', 'withdrawals', ['account_id'])
    op.create_index('ix_withdrawals_status', 'withdrawals', ['status'])


def downgrade() -> None:
    op.drop_table('withdrawals')
