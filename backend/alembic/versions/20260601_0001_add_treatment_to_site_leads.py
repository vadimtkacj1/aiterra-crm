"""add treatment to site_leads

Revision ID: a1b2c3d4e5f6
Revises: 03b58d50a3af
Create Date: 2026-06-01 00:01:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '03b58d50a3af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_leads', sa.Column('treatment', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('site_leads', 'treatment')
