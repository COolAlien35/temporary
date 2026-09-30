"""Transactional job API exposed to domain modules."""

from dataclasses import dataclass
from typing import cast
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.identity.public import Actor
from app.modules.jobs.execution import JobLease, claim_job, finish_job
from app.modules.jobs.outbox import enqueue_job
from app.modules.jobs.repository import list_owned_job_statuses
from app.modules.jobs.schemas import JobStatus
from app.modules.jobs.service import JobTransitionConflict, read_job


@dataclass(frozen=True)
class OwnedJobState:
    status: JobStatus
    error_code: str | None
    result_summary: dict[str, object] | None


@dataclass(frozen=True)
class OwnedJobSummary:
    status: JobStatus
    error_code: str | None


def owned_job_state(session: Session, actor: Actor, job_id: UUID) -> OwnedJobState:
    job = read_job(session, actor, job_id)
    return OwnedJobState(cast(JobStatus, job.status), job.error_code, job.result_summary)


def owned_job_summaries(
    session: Session, actor: Actor, job_ids: list[UUID]
) -> dict[UUID, OwnedJobSummary]:
    return {
        job_id: OwnedJobSummary(cast(JobStatus, status), error_code)
        for job_id, status, error_code in list_owned_job_statuses(session, actor.id, job_ids)
    }


__all__ = [
    "JobLease",
    "JobTransitionConflict",
    "OwnedJobState",
    "OwnedJobSummary",
    "claim_job",
    "enqueue_job",
    "finish_job",
    "owned_job_state",
    "owned_job_summaries",
]
