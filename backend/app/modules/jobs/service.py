import json
from base64 import b64decode, urlsafe_b64encode
from binascii import Error as Base64Error
from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.identity.public import Actor
from app.modules.jobs.models import Job
from app.modules.jobs.repository import (
    get_job_for_update,
    get_outbox_for_job,
    get_owned_job,
    list_owned_jobs,
)
from app.modules.jobs.schemas import FRONTEND_STATUS, JobKind, JobPage, JobStatus, JobSummary

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


def cancel_queued_job(session: Session, actor: Actor, job_id: UUID) -> Job:
    """Cancel before worker claim; a published delivery remains fenced by job status."""
    with session.begin():
        job = get_job_for_update(session, job_id)
        if job is None or job.owner_id != actor.id:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status == "cancelled":
            return job
        if job.status != "queued":
            raise ApiHTTPException(409, "job_not_queued", "Only queued jobs can be cancelled")
        now = datetime.now(UTC)
        job.status = "cancelled"
        job.finished_at = now
        message = get_outbox_for_job(session, job_id)
        if message is not None and message.published_at is None:
            message.discarded_at = now
        session.flush()
        session.refresh(job)
        return job


def _decode_cursor(cursor: str | None) -> tuple[datetime, UUID] | None:
    if cursor is None:
        return None
    try:
        if not 1 <= len(cursor) <= 256:
            raise ValueError
        raw = b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True)
        value = json.loads(raw)
        if not isinstance(value, dict) or set(value) != {"created_at", "id"}:
            raise ValueError
        created_at = datetime.fromisoformat(value["created_at"])
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError
        return created_at, UUID(value["id"])
    except (ValueError, TypeError, KeyError, Base64Error, UnicodeDecodeError):
        raise ApiHTTPException(422, "invalid_cursor", "Invalid job cursor") from None


def list_jobs(session: Session, actor: Actor, limit: int, cursor: str | None) -> JobPage:
    rows = list_owned_jobs(session, actor.id, limit + 1, _decode_cursor(cursor))
    visible = rows[:limit]
    items = [
        JobSummary(
            id=job.id,
            kind=cast(JobKind, job.kind),
            status=cast(JobStatus, job.status),
            frontend_status=FRONTEND_STATUS[job.status],
            error_code=job.error_code,
            created_at=job.created_at,
            started_at=job.started_at,
            finished_at=job.finished_at,
        )
        for job in visible
    ]
    next_cursor = None
    if len(rows) > limit and visible:
        last = visible[-1]
        payload = json.dumps({"created_at": last.created_at.isoformat(), "id": str(last.id)})
        next_cursor = urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return JobPage(items=items, next_cursor=next_cursor)


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
