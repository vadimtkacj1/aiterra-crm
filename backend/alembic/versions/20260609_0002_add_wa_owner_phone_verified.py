"""add wa_owner_phone_verified to account_site_configs

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-09 00:02:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('account_site_configs', sa.Column('wa_owner_phone_verified', sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column('account_site_configs', 'wa_owner_phone_verified')
