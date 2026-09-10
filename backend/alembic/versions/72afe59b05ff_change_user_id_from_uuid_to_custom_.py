"""Change user ID from UUID to custom format (2 letters + 4 digits)

Revision ID: 72afe59b05ff
Revises: 0b78f4490f4a
Create Date: 2026-09-07 00:04:24.894607

"""
from typing import Sequence, Union
import random
import string

from alembic import op
import sqlalchemy as sa


revision: str = '72afe59b05ff'
down_revision: Union[str, None] = '0b78f4490f4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def generate_display_id() -> str:
    """Generate display ID: 2 uppercase letters + 4 random digits"""
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    digits = ''.join(random.choices(string.digits, k=4))
    return letters + digits


def upgrade() -> None:
    # Add display_id column (nullable first)
    op.add_column('users', sa.Column('display_id', sa.String(6), nullable=True))

    # Generate unique display IDs for existing users
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT id FROM users"))
    users = result.fetchall()

    used_ids = set()
    for (user_id,) in users:
        # Generate unique display ID
        while True:
            display_id = generate_display_id()
            if display_id not in used_ids:
                used_ids.add(display_id)
                break

        conn.execute(
            sa.text("UPDATE users SET display_id = :display_id WHERE id = :user_id"),
            {"display_id": display_id, "user_id": str(user_id)}
        )

    # Make display_id NOT NULL and add unique constraint
    op.alter_column('users', 'display_id', nullable=False)
    op.create_unique_constraint('uq_users_display_id', 'users', ['display_id'])
    op.create_index('ix_users_display_id', 'users', ['display_id'])


def downgrade() -> None:
    op.drop_index('ix_users_display_id', 'users')
    op.drop_constraint('uq_users_display_id', 'users', type_='unique')
    op.drop_column('users', 'display_id')
