"""Bind each local simulation job to an immutable owned circuit snapshot."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0012_experiment_runs"
down_revision = "0011_circuits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiment_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("circuit_id", sa.UUID(), nullable=False),
        sa.Column("circuit_revision", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("backend", sa.String(length=32), nullable=False),
        sa.Column("shots", sa.Integer(), nullable=False),
        sa.Column("seed", sa.BigInteger(), nullable=True),
        sa.Column("idempotency_key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("shots BETWEEN 1 AND 8192", name="ck_experiment_runs_valid_shots"),
        sa.CheckConstraint(
            "seed IS NULL OR seed BETWEEN 0 AND 4294967295", name="ck_experiment_runs_valid_seed"
        ),
        sa.ForeignKeyConstraint(
            ["circuit_id", "circuit_revision"],
            ["circuit_revisions.circuit_id", "circuit_revisions.revision"],
            name="fk_experiment_runs_circuit_revision",
        ),
        sa.ForeignKeyConstraint(["id"], ["jobs.id"], name="fk_experiment_runs_id_jobs"),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["profiles.id"], name="fk_experiment_runs_owner_id_profiles"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_experiment_runs"),
        sa.UniqueConstraint("owner_id", "idempotency_key", name="uq_experiment_runs_idempotency"),
    )
    op.create_index(
        "ix_experiment_runs_owner_created", "experiment_runs", ["owner_id", "created_at", "id"]
    )


def downgrade() -> None:
    op.drop_index("ix_experiment_runs_owner_created", table_name="experiment_runs")
    op.drop_table("experiment_runs")
