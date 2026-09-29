"""Index bounded learner history across sessions of the same lesson version."""

from alembic import op

revision = "0015_prediction_lesson_history"
down_revision = "0014_tutor_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_predictions_learner_lesson_locked",
        "predictions",
        ["learner_id", "lesson_id", "lesson_version", "locked_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_predictions_learner_lesson_locked", table_name="predictions")
