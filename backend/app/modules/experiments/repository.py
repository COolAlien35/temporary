from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
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


def list_owned_runs(
    session: Session, owner_id: UUID, limit: int, before: tuple[datetime, UUID] | None
) -> list[ExperimentRun]:
    query = (
        select(ExperimentRun)
        .where(ExperimentRun.owner_id == owner_id)
        .order_by(ExperimentRun.created_at.desc(), ExperimentRun.id.desc())
        .limit(limit)
    )
    if before is not None:
        created_at, run_id = before
        query = query.where(
            or_(
                ExperimentRun.created_at < created_at,
                and_(ExperimentRun.created_at == created_at, ExperimentRun.id < run_id),
            )
        )
    return list(session.scalars(query))


def count_owned_runs_since(session: Session, owner_id: UUID, since: datetime) -> int:
    return (
        session.scalar(
            select(func.count(ExperimentRun.id)).where(
                ExperimentRun.owner_id == owner_id, ExperimentRun.created_at >= since
            )
        )
        or 0
    )
