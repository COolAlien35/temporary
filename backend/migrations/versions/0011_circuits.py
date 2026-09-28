"""Create owner-scoped circuits with immutable revision snapshots."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0011_circuits"
down_revision = "0010_learning_predictions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "circuits",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("current_revision", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("current_revision >= 1", name="ck_circuits_valid_revision"),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["profiles.id"], name="fk_circuits_owner_id_profiles"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_circuits"),
        sa.UniqueConstraint("owner_id", "idempotency_key", name="uq_circuits_owner_idempotency"),
    )
    op.create_index("ix_circuits_owner_updated", "circuits", ["owner_id", "updated_at", "id"])
    op.create_table(
        "circuit_revisions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("circuit_id", sa.UUID(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("revision >= 1", name="ck_circuit_revisions_valid_revision"),
        sa.ForeignKeyConstraint(
            ["circuit_id"],
            ["circuits.id"],
            name="fk_circuit_revisions_circuit_id_circuits",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_circuit_revisions"),
        sa.UniqueConstraint("circuit_id", "revision", name="uq_circuit_revisions_number"),
    )
    op.create_index(
        "ix_circuit_revisions_circuit_created",
        "circuit_revisions",
        ["circuit_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_circuit_revisions_circuit_created", table_name="circuit_revisions")
    op.drop_table("circuit_revisions")
    op.drop_index("ix_circuits_owner_updated", table_name="circuits")
    op.drop_table("circuits")
