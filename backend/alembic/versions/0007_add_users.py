"""Add users table and user_id to flights

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

revision = "0007"
down_revision = "0006"


def upgrade():
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime, default=datetime.now(timezone.utc)),
    )

    # Create the initial user 'davinchow' with a temporary password hash
    # Password: the current ADMIN_PASSWORD env var (will be bcrypt hashed at runtime)
    from passlib.context import CryptContext
    import os
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password = os.environ.get("ADMIN_PASSWORD", "changeme")
    hashed = pwd_context.hash(password)

    op.execute(
        sa.text(
            "INSERT INTO users (username, password_hash, created_at) VALUES (:username, :hash, :created_at)"
        ).bindparams(username="davinchow", hash=hashed, created_at=datetime.now(timezone.utc))
    )

    # Add user_id column to flights (nullable first for migration)
    op.add_column("flights", sa.Column("user_id", sa.Integer, nullable=True))

    # Assign all existing flights to user 1 (davinchow)
    op.execute(sa.text("UPDATE flights SET user_id = 1"))

    # Make user_id non-nullable and add FK + index
    op.alter_column("flights", "user_id", nullable=False)
    op.create_foreign_key("fk_flights_user_id", "flights", "users", ["user_id"], ["id"])
    op.create_index("ix_flights_user_id", "flights", ["user_id"])


def downgrade():
    op.drop_index("ix_flights_user_id", table_name="flights")
    op.drop_constraint("fk_flights_user_id", "flights", type_="foreignkey")
    op.drop_column("flights", "user_id")
    op.drop_table("users")
