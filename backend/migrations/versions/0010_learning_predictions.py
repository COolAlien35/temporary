"""Persist learner-owned sessions and immutable prediction submissions."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0010_learning_predictions"
down_revision = "0009_outbox_publications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("learner_id", sa.UUID(), nullable=False),
        sa.Column("lesson_id", sa.String(length=120), nullable=False),
        sa.Column("lesson_version", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("lesson_version >= 1", name="ck_learning_sessions_valid_lesson_version"),
        sa.ForeignKeyConstraint(
            ["learner_id"], ["profiles.id"], name="fk_learning_sessions_learner_id_profiles"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_learning_sessions"),
        sa.UniqueConstraint(
            "learner_id", "idempotency_key", name="uq_learning_session_idempotency"
        ),
        sa.UniqueConstraint(
            "id", "learner_id", "lesson_id", "lesson_version", name="uq_learning_session_identity"
        ),
    )
    op.create_index(
        "ix_learning_sessions_learner_created",
        "learning_sessions",
        ["learner_id", "created_at", "id"],
    )
    op.create_table(
        "predictions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("learner_id", sa.UUID(), nullable=False),
        sa.Column("learning_session_id", sa.UUID(), nullable=False),
        sa.Column("lesson_id", sa.String(length=120), nullable=False),
        sa.Column("lesson_version", sa.Integer(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("prediction_vector", postgresql.ARRAY(sa.Float()), nullable=False),
        sa.Column("basis_labels", postgresql.ARRAY(sa.String(length=8)), nullable=False),
        sa.Column("measurement_qubits", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("comparison_basis", sa.String(length=24), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("idempotency_key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "locked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("lesson_version >= 1", name="ck_predictions_valid_lesson_version"),
        sa.CheckConstraint(
            "cardinality(prediction_vector) = cardinality(basis_labels)",
            name="ck_predictions_vector_size",
        ),
        sa.CheckConstraint(
            "comparison_basis IN ('ideal_probability', 'noisy_probability', 'sampled_frequency')",
            name="ck_predictions_valid_comparison_basis",
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR confidence BETWEEN 0 AND 1",
            name="ck_predictions_valid_confidence",
        ),
        sa.ForeignKeyConstraint(
            ["learner_id"], ["profiles.id"], name="fk_predictions_learner_id_profiles"
        ),
        sa.ForeignKeyConstraint(
            ["learning_session_id", "learner_id", "lesson_id", "lesson_version"],
            [
                "learning_sessions.id",
                "learning_sessions.learner_id",
                "learning_sessions.lesson_id",
                "learning_sessions.lesson_version",
            ],
            name="fk_prediction_learning_session_identity",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_predictions"),
        sa.UniqueConstraint("learner_id", "idempotency_key", name="uq_prediction_idempotency"),
    )
    op.create_index(
        "ix_predictions_learner_locked", "predictions", ["learner_id", "locked_at", "id"]
    )
    op.create_index(
        "ix_predictions_session_locked", "predictions", ["learning_session_id", "locked_at", "id"]
    )


def downgrade() -> None:
    op.drop_index("ix_predictions_session_locked", table_name="predictions")
    op.drop_index("ix_predictions_learner_locked", table_name="predictions")
    op.drop_table("predictions")
    op.drop_index("ix_learning_sessions_learner_created", table_name="learning_sessions")
    op.drop_table("learning_sessions")
