"""Track worker attempts and fence stale job completions."""

import sqlalchemy as sa
from alembic import op

revision = "0008_job_leases"
down_revision = "0007_job_outbox"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs", sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False)
    )
    op.add_column("jobs", sa.Column("lease_token", sa.UUID(), nullable=True))
    op.add_column("jobs", sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_jobs_status_lease_expiry", "jobs", ["status", "lease_expires_at"])


def downgrade() -> None:
    op.drop_index("ix_jobs_status_lease_expiry", table_name="jobs")
    op.drop_column("jobs", "lease_expires_at")
    op.drop_column("jobs", "lease_token")
    op.drop_column("jobs", "attempt_count")
