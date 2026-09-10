"""multiple accounts per user, margin/leverage, bonus, equity snapshots

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-10

Drops the one-account-per-(user, currency, type) constraint so a trader can
run several accounts side by side, and adds what each one needs to stand on
its own: a public account number, a user label, bonus funds, leverage, and the
margin those two imply. Orders and positions gain `account_id` because
`account_type` alone no longer identifies where a trade belongs.

Existing accounts are backfilled with generated numbers and marked primary for
their (user, type), so nothing has to be migrated by hand.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('accounts', sa.Column('account_number', sa.String(length=20), nullable=True))
    op.add_column('accounts', sa.Column('label', sa.String(length=60), nullable=True))
    op.add_column('accounts', sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('accounts', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('accounts', sa.Column('bonus_balance', sa.Numeric(20, 2), nullable=False, server_default='0'))
    op.add_column('accounts', sa.Column('leverage', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('accounts', sa.Column('margin_used', sa.Numeric(20, 2), nullable=False, server_default='0'))

    # Backfill numbers before making the column NOT NULL / unique. Row number
    # keeps them stable and collision-free without needing a sequence.
    op.execute("""
        UPDATE accounts SET account_number = 'VG-' || LPAD((100000 + rn)::text, 6, '0')
        FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM accounts) AS numbered
        WHERE accounts.id = numbered.id
    """)
    # One primary per (user, type) — the oldest account of each pair.
    op.execute("""
        UPDATE accounts SET is_primary = true
        WHERE id IN (
            SELECT DISTINCT ON (user_id, account_type) id
            FROM accounts ORDER BY user_id, account_type, created_at, id
        )
    """)
    op.alter_column('accounts', 'account_number', nullable=False)
    op.create_index(op.f('ix_accounts_account_number'), 'accounts', ['account_number'], unique=True)

    # The constraint that made multiple accounts impossible.
    op.drop_constraint('uq_account_user_currency_type', 'accounts', type_='unique')

    for table in ('orders', 'positions'):
        op.add_column(table, sa.Column('account_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(f'fk_{table}_account_id', table, 'accounts', ['account_id'], ['id'])
        op.create_index(op.f(f'ix_{table}_account_id'), table, ['account_id'], unique=False)

    op.add_column('positions', sa.Column('margin_reserved', sa.Numeric(20, 2), nullable=False, server_default='0'))
    op.add_column('positions', sa.Column('leverage', sa.Integer(), nullable=False, server_default='1'))

    # Point historical rows at the primary account of their type, so existing
    # trades still resolve to somewhere sensible.
    for table in ('orders', 'positions'):
        op.execute(f"""
            UPDATE {table} t SET account_id = a.id
            FROM accounts a
            WHERE a.user_id = t.user_id
              AND a.account_type = t.account_type
              AND a.is_primary = true
              AND t.account_id IS NULL
        """)

    op.create_table(
        'equity_snapshots',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('account_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('taken_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('balance', sa.Numeric(20, 2), nullable=False),
        sa.Column('equity', sa.Numeric(20, 2), nullable=False),
        sa.Column('margin_used', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('unrealized_pnl', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('realized_pnl', sa.Numeric(20, 2), nullable=False, server_default='0'),
        sa.Column('open_positions', sa.Numeric(6, 0), nullable=False, server_default='0'),
    )
    op.create_index('ix_equity_snapshots_account_id', 'equity_snapshots', ['account_id'])
    op.create_index('ix_equity_snapshots_taken_at', 'equity_snapshots', ['taken_at'])
    op.create_index('ix_equity_snapshots_account_taken', 'equity_snapshots', ['account_id', 'taken_at'])


def downgrade() -> None:
    op.drop_table('equity_snapshots')
    op.drop_column('positions', 'leverage')
    op.drop_column('positions', 'margin_reserved')
    for table in ('orders', 'positions'):
        op.drop_index(op.f(f'ix_{table}_account_id'), table_name=table)
        op.drop_constraint(f'fk_{table}_account_id', table, type_='foreignkey')
        op.drop_column(table, 'account_id')
    op.create_unique_constraint('uq_account_user_currency_type', 'accounts', ['user_id', 'currency', 'account_type'])
    op.drop_index(op.f('ix_accounts_account_number'), table_name='accounts')
    for col in ('margin_used', 'leverage', 'bonus_balance', 'is_active', 'is_primary', 'label', 'account_number'):
        op.drop_column('accounts', col)
