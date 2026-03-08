"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "airports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("openflights_id", sa.Integer(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("iata", sa.String(3), unique=True, nullable=True, index=True),
        sa.Column("icao", sa.String(4), unique=True, nullable=True, index=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("altitude_ft", sa.Integer(), nullable=True),
        sa.Column("timezone", sa.String(), nullable=True),
    )

    op.create_table(
        "airlines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("openflights_id", sa.Integer(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("alias", sa.String(), nullable=True),
        sa.Column("iata", sa.String(2), nullable=True, index=True),
        sa.Column("icao", sa.String(3), nullable=True, index=True),
        sa.Column("callsign", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("active", sa.String(1), nullable=True),
    )

    op.create_table(
        "flights",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("departure_iata", sa.String(3), nullable=False, index=True),
        sa.Column("arrival_iata", sa.String(3), nullable=False, index=True),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("airline_iata", sa.String(2), nullable=True),
        sa.Column("flight_number", sa.String(10), nullable=True),
        sa.Column("aircraft_type", sa.String(50), nullable=True),
        sa.Column("aircraft_registration", sa.String(20), nullable=True),
        sa.Column("seat_class", sa.String(20), nullable=True),
        sa.Column("seat_number", sa.String(10), nullable=True),
        sa.Column("seat_position", sa.String(10), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("trip_reason", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table("flights")
    op.drop_table("airlines")
    op.drop_table("airports")
