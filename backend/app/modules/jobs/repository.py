from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.modules.jobs.models import Job, JobOutbox


def get_owned_job(session: Session, job_id: UUID, owner_id: UUID) -> Job | None:
    return session.scalar(select(Job).where(Job.id == job_id, Job.owner_id == owner_id))


def list_owned_jobs(
    session: Session, owner_id: UUID, limit: int, before: tuple[datetime, UUID] | None
) -> list[Job]:
    query = (
        select(Job)
        .where(Job.owner_id == owner_id)
        .order_by(Job.created_at.desc(), Job.id.desc())
        .limit(limit)
    )
    if before is not None:
        created_at, job_id = before
        query = query.where(
            or_(Job.created_at < created_at, and_(Job.created_at == created_at, Job.id < job_id))
        )
    return list(session.scalars(query))


def get_job_for_update(session: Session, job_id: UUID) -> Job | None:
    return session.scalar(
        select(Job)
        .where(Job.id == job_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )


def get_outbox_for_job(session: Session, job_id: UUID) -> JobOutbox | None:
    return session.scalar(select(JobOutbox).where(JobOutbox.job_id == job_id))


def due_outbox_for_update(
    session: Session, now: datetime, limit: int
) -> list[tuple[JobOutbox, Job]]:
    return list(
        session.execute(
            select(JobOutbox, Job)
            .join(Job, Job.id == JobOutbox.job_id)
            .where(
                JobOutbox.published_at.is_(None),
                JobOutbox.discarded_at.is_(None),
                JobOutbox.next_attempt_at <= now,
            )
            .order_by(JobOutbox.next_attempt_at, JobOutbox.created_at, JobOutbox.id)
            .limit(limit)
            .with_for_update(of=JobOutbox, skip_locked=True)
        ).all()
    )


def expired_jobs_for_update(
    session: Session, now: datetime, limit: int
) -> list[tuple[JobOutbox, Job]]:
    return list(
        session.execute(
            select(JobOutbox, Job)
            .join(Job, Job.id == JobOutbox.job_id)
            .where(Job.status == "running", Job.lease_expires_at <= now)
            .order_by(Job.lease_expires_at, Job.id)
            .limit(limit)
            .with_for_update(of=JobOutbox, skip_locked=True)
        ).all()
    )


def stale_unclaimed_jobs_for_update(
    session: Session, cutoff: datetime, limit: int
) -> list[tuple[JobOutbox, Job]]:
    return list(
        session.execute(
            select(JobOutbox, Job)
            .join(Job, Job.id == JobOutbox.job_id)
            .where(
                Job.status == "queued",
                Job.lease_token.is_(None),
                JobOutbox.discarded_at.is_(None),
                JobOutbox.published_at.is_not(None),
                JobOutbox.published_at <= cutoff,
            )
            .order_by(JobOutbox.published_at, JobOutbox.id)
            .limit(limit)
            .with_for_update(of=JobOutbox, skip_locked=True)
        ).all()
    )
