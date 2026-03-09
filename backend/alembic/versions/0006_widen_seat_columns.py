"""Widen seat_number and seat_position columns."""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("flights", "seat_number", type_=sa.String(30))
    op.alter_column("flights", "seat_position", type_=sa.String(20))


def downgrade():
    op.alter_column("flights", "seat_number", type_=sa.String(10))
    op.alter_column("flights", "seat_position", type_=sa.String(10))
