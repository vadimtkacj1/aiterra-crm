"""add invoices + invoice_lines registry

Additive only: no existing table is altered or dropped. Rows are imported by
app.db.session._backfill_invoices on boot, which is idempotent.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-07-24 00:02:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('source_type', sa.String(32), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(8), nullable=False, server_default='ILS'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('provider', sa.String(20), nullable=False, server_default='zcredit'),
        sa.Column('provider_doc_id', sa.String(255), nullable=True),
        sa.Column('provider_url', sa.String(2048), nullable=True),
        sa.Column('superseded_by_id', sa.Integer(), nullable=True),
        sa.Column('customer_name', sa.String(200), nullable=True),
        sa.Column('customer_email', sa.String(255), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reference_number', sa.String(255), nullable=True),
        sa.Column('approval_number', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by_admin_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['superseded_by_id'], ['invoices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoices_account_id', 'invoices', ['account_id'])
    op.create_index('ix_invoices_provider_doc_id', 'invoices', ['provider_doc_id'])
    op.create_index('ix_invoices_source_type', 'invoices', ['source_type'])
    op.create_index('ix_invoices_source_id', 'invoices', ['source_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])

    op.create_table(
        'invoice_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['contract_payment_stages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoice_lines_invoice_id', 'invoice_lines', ['invoice_id'])
    op.create_index('ix_invoice_lines_stage_id', 'invoice_lines', ['stage_id'])


def downgrade() -> None:
    op.drop_index('ix_invoice_lines_stage_id', table_name='invoice_lines')
    op.drop_index('ix_invoice_lines_invoice_id', table_name='invoice_lines')
    op.drop_table('invoice_lines')
    for idx in (
        'ix_invoices_status',
        'ix_invoices_source_id',
        'ix_invoices_source_type',
        'ix_invoices_provider_doc_id',
        'ix_invoices_account_id',
    ):
        op.drop_index(idx, table_name='invoices')
    op.drop_table('invoices')
