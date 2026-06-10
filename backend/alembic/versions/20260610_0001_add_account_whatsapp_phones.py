"""add account_whatsapp_phones table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-10 00:01:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'account_whatsapp_phones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('accounts.id'), nullable=False),
        sa.Column('connect_code', sa.String(20), nullable=False),
        sa.Column('verified_phone', sa.String(30), nullable=True),
        sa.Column('label', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_account_whatsapp_phones_id', 'account_whatsapp_phones', ['id'])
    op.create_index('ix_account_whatsapp_phones_account_id', 'account_whatsapp_phones', ['account_id'])
    op.create_index('ix_account_whatsapp_phones_connect_code', 'account_whatsapp_phones', ['connect_code'], unique=True)

    # Migrate existing single-phone data from account_site_configs
    op.execute("""
        INSERT INTO account_whatsapp_phones (account_id, connect_code, verified_phone, created_at)
        SELECT account_id, wa_connect_code, wa_owner_phone_verified, updated_at
        FROM account_site_configs
        WHERE wa_connect_code IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_index('ix_account_whatsapp_phones_connect_code', table_name='account_whatsapp_phones')
    op.drop_index('ix_account_whatsapp_phones_account_id', table_name='account_whatsapp_phones')
    op.drop_index('ix_account_whatsapp_phones_id', table_name='account_whatsapp_phones')
    op.drop_table('account_whatsapp_phones')
