"""Keep the exact saved run on tutor messages for reliable reloads."""

import sqlalchemy as sa
from alembic import op

revision = "0017_tutor_message_run"
down_revision = "0016_learning_session_resume"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tutor_messages", sa.Column("run_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_tutor_messages_run_id_experiment_runs",
        "tutor_messages",
        "experiment_runs",
        ["run_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_tutor_messages_run_id_experiment_runs", "tutor_messages", type_="foreignkey"
    )
    op.drop_column("tutor_messages", "run_id")
