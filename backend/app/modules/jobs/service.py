import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.identity.public import Actor
from app.modules.jobs.models import Job
from app.modules.jobs.repository import get_job_for_update, get_owned_job
from app.modules.jobs.schemas import JobKind, JobStatus

QUEUE_FOR_KIND: dict[JobKind, str] = {
    "simulation": "simulation",
    "optimization": "optimization",
    "grading": "grading",
    "export": "maintenance",
}
ALLOWED_TRANSITIONS: dict[JobStatus, frozenset[JobStatus]] = {
    "queued": frozenset({"running", "cancelled"}),
    "running": frozenset({"succeeded", "failed", "cancelled", "timed_out", "unknown"}),
    "unknown": frozenset({"succeeded", "failed", "cancelled", "timed_out"}),
    "succeeded": frozenset(),
    "failed": frozenset(),
    "cancelled": frozenset(),
    "timed_out": frozenset(),
}
TERMINAL_STATUSES = frozenset({"succeeded", "failed", "cancelled", "timed_out"})
MAX_RESULT_BYTES = 16_384


class JobTransitionConflict(Exception):
    pass


def create_job(session: Session, actor: Actor, kind: JobKind) -> Job:
    """Create an inert record for internal tests; dispatchable work uses the outbox."""
    with session.begin():
        job = Job(owner_id=actor.id, kind=kind, queue=QUEUE_FOR_KIND[kind], status="queued")
        session.add(job)
        session.flush()
        session.refresh(job)
    return job


def read_job(session: Session, actor: Actor, job_id: UUID) -> Job:
    job = get_owned_job(session, job_id, actor.id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def transition_job(
    session: Session,
    job_id: UUID,
    expected: JobStatus,
    target: JobStatus,
    *,
    result_summary: dict[str, object] | None = None,
    error_code: str | None = None,
) -> Job:
    """Lock and change one job. Identical terminal delivery is safe to replay."""
    if target not in ALLOWED_TRANSITIONS[expected]:
        raise ValueError(f"Invalid job transition: {expected} -> {target}")
    if target == "succeeded":
        if error_code is not None:
            raise ValueError("Successful jobs cannot have an error code")
    elif result_summary is not None:
        raise ValueError("Only successful jobs can store a result summary")
    if target in {"failed", "timed_out"} and not error_code:
        raise ValueError("Failed jobs require an error code")
    if error_code is not None and (len(error_code) > 64 or not error_code.isidentifier()):
        raise ValueError("Error code must be a short identifier")
    if result_summary is not None:
        try:
            encoded = json.dumps(result_summary, allow_nan=False).encode()
        except (TypeError, ValueError):
            raise ValueError("Result summary must be finite JSON") from None
        if len(encoded) > MAX_RESULT_BYTES:
            raise ValueError("Result summary is too large")

    with session.begin():
        job = get_job_for_update(session, job_id)
        if job is None:
            raise LookupError("Job not found")
        if job.status == target and target in TERMINAL_STATUSES:
            if job.result_summary == result_summary and job.error_code == error_code:
                return job
            raise JobTransitionConflict("Conflicting terminal result")
        if job.status != expected:
            raise JobTransitionConflict("Job state changed")
        if job.lease_token is not None and target != "cancelled":
            raise JobTransitionConflict("Leased jobs require a fenced worker completion")
        job.status = target
        now = datetime.now(UTC)
        if target == "running":
            job.started_at = now
        if target in TERMINAL_STATUSES:
            job.finished_at = now
        if target == "cancelled":
            job.lease_token = None
            job.lease_expires_at = None
        job.result_summary = result_summary
        job.error_code = error_code
        session.flush()
        session.refresh(job)
    return job
