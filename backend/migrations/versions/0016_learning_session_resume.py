"""Index owned learning sessions for lesson resume lookup."""

from alembic import op

revision = "0016_learning_session_resume"
down_revision = "0015_prediction_lesson_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_learning_sessions_learner_lesson_created",
        "learning_sessions",
        ["learner_id", "lesson_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_learning_sessions_learner_lesson_created", table_name="learning_sessions")
