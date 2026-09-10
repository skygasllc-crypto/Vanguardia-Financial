"""Create deposit tables manually

Revision ID: 08ec64e1f104
Revises: 4a7938aec89f
Create Date: 2026-09-06 12:41:37.414651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '08ec64e1f104'
down_revision: Union[str, None] = '4a7938aec89f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create deposit_wallets table
    op.create_table(
        'deposit_wallets',
        sa.Column('currency_id', sa.String(length=20), nullable=False),
        sa.Column('currency_name', sa.String(length=100), nullable=False),
        sa.Column('currency_symbol', sa.String(length=10), nullable=False),
        sa.Column('network', sa.String(length=50), nullable=False),
        sa.Column('network_fee', sa.String(length=50), nullable=False),
        sa.Column('icon', sa.String(length=10), nullable=False),
        sa.Column('wallet_address', sa.String(length=255), nullable=False),
        sa.Column('memo_tag', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('minimum_deposit', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deposit_wallets_currency_id'), 'deposit_wallets', ['currency_id'], unique=True)

    # Create deposits table
    op.create_table(
        'deposits',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('currency_id', sa.String(length=20), nullable=False),
        sa.Column('currency_symbol', sa.String(length=10), nullable=False),
        sa.Column('network', sa.String(length=50), nullable=False),
        sa.Column('deposit_address', sa.String(length=255), nullable=False),
        sa.Column('transaction_hash', sa.String(length=255), nullable=True),
        sa.Column('amount', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('network_fee', sa.Numeric(precision=20, scale=8), nullable=True),
        sa.Column('credited_amount', sa.Numeric(precision=20, scale=8), nullable=True),
        sa.Column('status', sa.Enum('pending', 'confirming', 'confirmed', 'credited', 'failed', 'cancelled', name='depositstatus', native_enum=False, length=32), nullable=False, server_default='pending'),
        sa.Column('confirmations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('required_confirmations', sa.Integer(), nullable=False, server_default='6'),
        sa.Column('admin_notes', sa.String(length=500), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deposits_status'), 'deposits', ['status'], unique=False)
    op.create_index(op.f('ix_deposits_transaction_hash'), 'deposits', ['transaction_hash'], unique=False)
    op.create_index(op.f('ix_deposits_user_id'), 'deposits', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_deposits_user_id'), table_name='deposits')
    op.drop_index(op.f('ix_deposits_transaction_hash'), table_name='deposits')
    op.drop_index(op.f('ix_deposits_status'), table_name='deposits')
    op.drop_table('deposits')
    op.drop_index(op.f('ix_deposit_wallets_currency_id'), table_name='deposit_wallets')
    op.drop_table('deposit_wallets')
    sa.Enum('pending', 'confirming', 'confirmed', 'credited', 'failed', 'cancelled', name='depositstatus').drop(op.get_bind())
