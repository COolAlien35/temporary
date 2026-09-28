"""Transactional job API exposed to domain modules."""

from dataclasses import dataclass
from typing import cast
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.identity.public import Actor
from app.modules.jobs.execution import JobLease, claim_job, finish_job
from app.modules.jobs.outbox import enqueue_job
from app.modules.jobs.schemas import JobStatus
from app.modules.jobs.service import JobTransitionConflict, read_job


@dataclass(frozen=True)
class OwnedJobState:
    status: JobStatus
    error_code: str | None
    result_summary: dict[str, object] | None


def owned_job_state(session: Session, actor: Actor, job_id: UUID) -> OwnedJobState:
    job = read_job(session, actor, job_id)
    return OwnedJobState(cast(JobStatus, job.status), job.error_code, job.result_summary)


__all__ = [
    "JobLease",
    "JobTransitionConflict",
    "OwnedJobState",
    "claim_job",
    "enqueue_job",
    "finish_job",
    "owned_job_state",
]
