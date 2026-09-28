"""Create durable, owner-scoped background job records."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005_jobs"
down_revision = "0004_profile_revisions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("queue", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("result_summary", postgresql.JSONB(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "kind IN ('simulation', 'optimization', 'grading', 'export')",
            name="ck_jobs_valid_kind",
        ),
        sa.CheckConstraint(
            "queue IN ('simulation', 'optimization', 'grading', 'maintenance')",
            name="ck_jobs_valid_queue",
        ),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', "
            "'timed_out', 'unknown')",
            name="ck_jobs_valid_status",
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["profiles.id"], name="fk_jobs_owner_id_profiles"),
        sa.PrimaryKeyConstraint("id", name="pk_jobs"),
    )
    op.create_index("ix_jobs_owner_created_id", "jobs", ["owner_id", "created_at", "id"])
    op.create_index("ix_jobs_status_created", "jobs", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_jobs_status_created", table_name="jobs")
    op.drop_index("ix_jobs_owner_created_id", table_name="jobs")
    op.drop_table("jobs")
