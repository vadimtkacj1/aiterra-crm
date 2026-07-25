"""add payment_url + superseded_doc_ids to contract_payment_stages

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-24 00:01:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contract_payment_stages', sa.Column('payment_url', sa.String(2048), nullable=True))
    op.add_column('contract_payment_stages', sa.Column('superseded_doc_ids', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('contract_payment_stages', 'superseded_doc_ids')
    op.drop_column('contract_payment_stages', 'payment_url')
