"""Make flighty_id unique per user instead of globally unique

Revision ID: 0008
Revises: 0007
"""
from alembic import op

revision = "0008"
down_revision = "0007"


def upgrade():
    # Drop the global unique constraint/index on flighty_id
    op.drop_index("ix_flights_flighty_id", table_name="flights")
    # Create a composite unique constraint (user_id + flighty_id)
    op.create_unique_constraint(
        "uq_flights_user_flighty_id", "flights", ["user_id", "flighty_id"]
    )
    # Keep a non-unique index for lookups
    op.create_index("ix_flights_flighty_id", "flights", ["flighty_id"])


def downgrade():
    op.drop_index("ix_flights_flighty_id", table_name="flights")
    op.drop_constraint("uq_flights_user_flighty_id", "flights", type_="unique")
    op.create_index("ix_flights_flighty_id", "flights", ["flighty_id"], unique=True)
