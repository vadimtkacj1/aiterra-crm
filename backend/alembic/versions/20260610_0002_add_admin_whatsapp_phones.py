"""add admin_whatsapp_phones table

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-10 00:02:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'admin_whatsapp_phones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone', sa.String(30), nullable=False),
        sa.Column('label', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_whatsapp_phones_id', 'admin_whatsapp_phones', ['id'])


def downgrade() -> None:
    op.drop_index('ix_admin_whatsapp_phones_id', table_name='admin_whatsapp_phones')
    op.drop_table('admin_whatsapp_phones')
