from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.experiments.models import ExperimentRun


def get_owned_run(session: Session, run_id: UUID, owner_id: UUID) -> ExperimentRun | None:
    return session.scalar(
        select(ExperimentRun).where(ExperimentRun.id == run_id, ExperimentRun.owner_id == owner_id)
    )


def get_run_by_key(session: Session, owner_id: UUID, key: UUID) -> ExperimentRun | None:
    return session.scalar(
        select(ExperimentRun).where(
            ExperimentRun.owner_id == owner_id,
            ExperimentRun.idempotency_key == key,
        )
    )
