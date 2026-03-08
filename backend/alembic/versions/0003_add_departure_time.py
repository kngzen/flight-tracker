"""Add departure_time column to flights."""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("flights", sa.Column("departure_time", sa.String(5), nullable=True))


def downgrade():
    op.drop_column("flights", "departure_time")
