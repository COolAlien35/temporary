"""Persist bounded tutor exchanges and their verified source metadata."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0014_tutor_messages"
down_revision = "0013_prediction_run_pairing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tutor_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("learning_session_id", sa.UUID(), nullable=False),
        sa.Column("idempotency_key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("action", sa.String(24), nullable=False),
        sa.Column("stage", sa.String(24), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("prompt_version", sa.String(32), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("source_record_ids", postgresql.ARRAY(sa.String(120)), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=True),
        sa.Column("recommendation", postgresql.JSONB(), nullable=True),
        sa.Column("provider_called", sa.Boolean(), nullable=True),
        sa.Column("error_code", sa.String(32), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'completed', 'failed')", name="ck_tutor_messages_valid_status"
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["profiles.id"], name="fk_tutor_messages_owner_id_profiles"
        ),
        sa.ForeignKeyConstraint(
            ["learning_session_id"],
            ["learning_sessions.id"],
            name="fk_tutor_messages_learning_session_id_learning_sessions",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_tutor_messages"),
        sa.UniqueConstraint("owner_id", "idempotency_key", name="uq_tutor_message_idempotency"),
    )
    op.create_index(
        "ix_tutor_messages_owner_created", "tutor_messages", ["owner_id", "created_at", "id"]
    )
    op.create_index(
        "ix_tutor_messages_session_created",
        "tutor_messages",
        ["learning_session_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_tutor_messages_session_created", table_name="tutor_messages")
    op.drop_index("ix_tutor_messages_owner_created", table_name="tutor_messages")
    op.drop_table("tutor_messages")
