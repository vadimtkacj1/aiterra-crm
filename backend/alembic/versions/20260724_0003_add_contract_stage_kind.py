"""add kind to contract_payment_stages

Replaces inferring "this stage sells the subscription" from sort_order == 0. Existing
rows are classified by that exact old rule, so behaviour is unchanged for current data.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-07-24 00:03:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contract_payment_stages', sa.Column('kind', sa.String(20), nullable=True))
    op.execute(
        "UPDATE contract_payment_stages SET kind = 'subscription' "
        "WHERE kind IS NULL AND sort_order = 0 AND contract_id IN "
        "(SELECT id FROM contracts WHERE monthly_amount IS NOT NULL AND monthly_amount > 0)"
    )
    op.execute("UPDATE contract_payment_stages SET kind = 'one_time' WHERE kind IS NULL")


def downgrade() -> None:
    op.drop_column('contract_payment_stages', 'kind')
