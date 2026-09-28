"""Persist job dispatch intents in the same database as jobs."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_job_outbox"
down_revision = "0006_content_chunks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_outbox",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("job_id", sa.UUID(), nullable=False),
        sa.Column("task_name", sa.String(length=128), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column(
            "next_attempt_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("discarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_code", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], name="fk_job_outbox_job_id_jobs"),
        sa.PrimaryKeyConstraint("id", name="pk_job_outbox"),
        sa.UniqueConstraint("job_id", name="uq_job_outbox_job_id"),
    )
    op.create_index("ix_job_outbox_pending", "job_outbox", ["next_attempt_at", "created_at", "id"])


def downgrade() -> None:
    op.drop_index("ix_job_outbox_pending", table_name="job_outbox")
    op.drop_table("job_outbox")
