"""Create cohorts, memberships, and single-use email invitations."""

import sqlalchemy as sa
from alembic import op

revision = "0003_cohorts"
down_revision = "0002_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cohorts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["profiles.id"], name="fk_cohorts_created_by_profiles"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_cohorts"),
    )
    op.create_table(
        "cohort_memberships",
        sa.Column("cohort_id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "role IN ('learner', 'instructor')", name="ck_cohort_memberships_valid_role"
        ),
        sa.ForeignKeyConstraint(
            ["cohort_id"],
            ["cohorts.id"],
            name="fk_cohort_memberships_cohort_id_cohorts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["profiles.id"], name="fk_cohort_memberships_profile_id_profiles"
        ),
        sa.PrimaryKeyConstraint("cohort_id", "profile_id", name="pk_cohort_memberships"),
    )
    op.create_index("ix_cohort_memberships_profile_id", "cohort_memberships", ["profile_id"])
    op.create_table(
        "cohort_invitations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cohort_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_by", sa.UUID(), nullable=True),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["cohort_id"],
            ["cohorts.id"],
            name="fk_cohort_invitations_cohort_id_cohorts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["profiles.id"], name="fk_cohort_invitations_created_by_profiles"
        ),
        sa.ForeignKeyConstraint(
            ["consumed_by"], ["profiles.id"], name="fk_cohort_invitations_consumed_by_profiles"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_cohort_invitations"),
    )
    op.create_index(
        "ix_cohort_invitations_token_hash", "cohort_invitations", ["token_hash"], unique=True
    )
    op.create_index("ix_cohort_invitations_cohort_id", "cohort_invitations", ["cohort_id"])


def downgrade() -> None:
    op.drop_index("ix_cohort_invitations_cohort_id", table_name="cohort_invitations")
    op.drop_index("ix_cohort_invitations_token_hash", table_name="cohort_invitations")
    op.drop_table("cohort_invitations")
    op.drop_index("ix_cohort_memberships_profile_id", table_name="cohort_memberships")
    op.drop_table("cohort_memberships")
    op.drop_table("cohorts")
