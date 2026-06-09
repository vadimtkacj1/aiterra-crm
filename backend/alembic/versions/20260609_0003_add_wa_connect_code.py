"""add wa_connect_code to account_site_configs

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-09 00:03:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('account_site_configs', sa.Column('wa_connect_code', sa.String(20), nullable=True))
    op.create_index('ix_account_site_configs_wa_connect_code', 'account_site_configs', ['wa_connect_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_account_site_configs_wa_connect_code', table_name='account_site_configs')
    op.drop_column('account_site_configs', 'wa_connect_code')
