"""Count successful publications separately from failed broker attempts."""

import sqlalchemy as sa
from alembic import op

revision = "0009_outbox_publications"
down_revision = "0008_job_leases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "job_outbox",
        sa.Column("publication_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.execute("UPDATE job_outbox SET publication_count = 1 WHERE published_at IS NOT NULL")
    op.create_index("ix_job_outbox_published_at", "job_outbox", ["published_at"])


def downgrade() -> None:
    op.drop_index("ix_job_outbox_published_at", table_name="job_outbox")
    op.drop_column("job_outbox", "publication_count")
