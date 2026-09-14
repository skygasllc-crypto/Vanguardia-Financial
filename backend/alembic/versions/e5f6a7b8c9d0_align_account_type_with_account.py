"""align order and position account_type with their account

Orders took `account_type` from the client, which could disagree with the
account the order actually filled on, and the positions they opened copied it.
Those rows were listed under the wrong book (a real account's trades showing on
the demo side). The code now takes the type from the account; this corrects
rows written before that. Idempotent: rows that already agree are untouched.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders AS o
        SET account_type = a.account_type
        FROM accounts AS a
        WHERE o.account_id = a.id AND o.account_type <> a.account_type
        """
    )
    op.execute(
        """
        UPDATE positions AS p
        SET account_type = a.account_type
        FROM accounts AS a
        WHERE p.account_id = a.id AND p.account_type <> a.account_type
        """
    )


def downgrade() -> None:
    # A data correction; the previous, inconsistent values are not restored.
    pass
