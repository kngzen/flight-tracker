"""Widen varchar columns to prevent truncation."""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("flights", "flight_number", type_=sa.String(20))
    op.alter_column("flights", "aircraft_registration", type_=sa.String(50))
    op.alter_column("flights", "seat_class", type_=sa.String(30))
    op.alter_column("flights", "seat_number", type_=sa.String(30))
    op.alter_column("flights", "seat_position", type_=sa.String(20))
    op.alter_column("flights", "trip_reason", type_=sa.String(30))
    op.alter_column("flights", "pnr", type_=sa.String(50))
    op.alter_column("flights", "flighty_id", type_=sa.String(100))


def downgrade():
    op.alter_column("flights", "flight_number", type_=sa.String(10))
    op.alter_column("flights", "aircraft_registration", type_=sa.String(20))
    op.alter_column("flights", "seat_class", type_=sa.String(20))
    op.alter_column("flights", "seat_number", type_=sa.String(10))
    op.alter_column("flights", "seat_position", type_=sa.String(10))
    op.alter_column("flights", "trip_reason", type_=sa.String(20))
    op.alter_column("flights", "pnr", type_=sa.String(20))
    op.alter_column("flights", "flighty_id", type_=sa.String(50))
