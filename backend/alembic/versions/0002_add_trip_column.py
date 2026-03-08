"""Add trip column to flights

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-08

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("flights", sa.Column("trip", sa.String(100), nullable=True))


def downgrade():
    op.drop_column("flights", "trip")
