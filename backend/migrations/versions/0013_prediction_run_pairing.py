"""Bind one immutable learner prediction to one saved simulation run."""

import sqlalchemy as sa
from alembic import op

revision = "0013_prediction_run_pairing"
down_revision = "0012_experiment_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("predictions", sa.Column("run_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_predictions_run_id_experiment_runs",
        "predictions",
        "experiment_runs",
        ["run_id"],
        ["id"],
    )
    op.create_unique_constraint("uq_predictions_run_id", "predictions", ["run_id"])
    op.add_column("experiment_runs", sa.Column("prediction_id", sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column("experiment_runs", "prediction_id")
    op.drop_constraint("uq_predictions_run_id", "predictions", type_="unique")
    op.drop_constraint("fk_predictions_run_id_experiment_runs", "predictions", type_="foreignkey")
    op.drop_column("predictions", "run_id")
