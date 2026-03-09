"""Add Flighty import fields: times, terminals, gates, aircraft ICAO, pnr, canceled, flighty_id."""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("flights", sa.Column("arrival_time", sa.String(5), nullable=True))
    op.add_column("flights", sa.Column("departure_time_actual", sa.String(5), nullable=True))
    op.add_column("flights", sa.Column("arrival_time_actual", sa.String(5), nullable=True))
    op.add_column("flights", sa.Column("dep_terminal", sa.String(10), nullable=True))
    op.add_column("flights", sa.Column("dep_gate", sa.String(10), nullable=True))
    op.add_column("flights", sa.Column("arr_terminal", sa.String(10), nullable=True))
    op.add_column("flights", sa.Column("arr_gate", sa.String(10), nullable=True))
    op.add_column("flights", sa.Column("aircraft_type_icao", sa.String(10), nullable=True))
    op.add_column("flights", sa.Column("pnr", sa.String(20), nullable=True))
    op.add_column("flights", sa.Column("canceled", sa.Boolean(), server_default="false"))
    op.add_column("flights", sa.Column("flighty_id", sa.String(50), nullable=True))
    op.create_index("ix_flights_flighty_id", "flights", ["flighty_id"], unique=True)


def downgrade():
    op.drop_index("ix_flights_flighty_id")
    op.drop_column("flights", "flighty_id")
    op.drop_column("flights", "canceled")
    op.drop_column("flights", "pnr")
    op.drop_column("flights", "aircraft_type_icao")
    op.drop_column("flights", "arr_gate")
    op.drop_column("flights", "arr_terminal")
    op.drop_column("flights", "dep_gate")
    op.drop_column("flights", "dep_terminal")
    op.drop_column("flights", "arrival_time_actual")
    op.drop_column("flights", "departure_time_actual")
    op.drop_column("flights", "arrival_time")
