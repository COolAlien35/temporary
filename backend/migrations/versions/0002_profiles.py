"""Create managed-auth-linked learner profiles."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_profiles"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("auth_subject", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("preferences", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("role IN ('learner', 'instructor')", name="ck_profiles_valid_role"),
        sa.PrimaryKeyConstraint("id", name="pk_profiles"),
    )
    op.create_index("ix_profiles_auth_subject", "profiles", ["auth_subject"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_profiles_auth_subject", table_name="profiles")
    op.drop_table("profiles")
