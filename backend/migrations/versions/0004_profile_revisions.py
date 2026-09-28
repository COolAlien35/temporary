"""Add learner timezone and optimistic profile revisions."""

import sqlalchemy as sa
from alembic import op

revision = "0004_profile_revisions"
down_revision = "0003_cohorts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("timezone", sa.String(length=64), server_default="UTC", nullable=False),
    )
    op.add_column(
        "profiles", sa.Column("revision", sa.Integer(), server_default="1", nullable=False)
    )
    op.create_check_constraint("ck_profiles_positive_revision", "profiles", "revision >= 1")


def downgrade() -> None:
    op.drop_constraint("ck_profiles_positive_revision", "profiles", type_="check")
    op.drop_column("profiles", "revision")
    op.drop_column("profiles", "timezone")
