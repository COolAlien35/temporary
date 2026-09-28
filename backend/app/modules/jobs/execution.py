"""Database leases that fence duplicate and stale worker deliveries."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.modules.jobs.models import Job
from app.modules.jobs.repository import get_job_for_update
from app.modules.jobs.service import MAX_RESULT_BYTES, JobTransitionConflict

Outcome = Literal["succeeded", "failed"]


@dataclass(frozen=True)
class JobLease:
    job_id: UUID
    token: UUID
    attempt: int


def claim_job(
    session: Session,
    job_id: UUID,
    *,
    lease_seconds: int,
    retry_expired: bool = False,
    now: datetime | None = None,
) -> JobLease | None:
    """One worker claims a queued job; safe local tasks may reclaim an expired lease."""
    if lease_seconds <= 0:
        raise ValueError("Lease duration must be positive")
    instant = now or datetime.now(UTC)
    with session.begin():
        job = get_job_for_update(session, job_id)
        if job is None:
            raise LookupError("Job not found")
        if job.status == "running":
            if not retry_expired or job.lease_expires_at is None or job.lease_expires_at > instant:
                return None
        elif job.status != "queued":
            return None
        job.status = "running"
        job.attempt_count += 1
        token = uuid4()
        job.lease_token = token
        job.lease_expires_at = instant + timedelta(seconds=lease_seconds)
        if job.started_at is None:
            job.started_at = instant
        session.flush()
        return JobLease(job_id, token, job.attempt_count)


def finish_job(
    session: Session,
    lease: JobLease,
    outcome: Outcome,
    *,
    result_summary: dict[str, object] | None = None,
    error_code: str | None = None,
    now: datetime | None = None,
) -> Job:
    """Commit a result only from the current, unexpired lease holder."""
    if outcome == "succeeded":
        if error_code is not None:
            raise ValueError("Successful jobs cannot have an error code")
    else:
        if not error_code or len(error_code) > 64 or not error_code.isidentifier():
            raise ValueError("Failed jobs require a short error identifier")
        if result_summary is not None:
            raise ValueError("Failed jobs cannot have a result summary")
    if result_summary is not None:
        try:
            encoded = json.dumps(result_summary, allow_nan=False).encode()
        except (TypeError, ValueError):
            raise ValueError("Result summary must be finite JSON") from None
        if len(encoded) > MAX_RESULT_BYTES:
            raise ValueError("Result summary is too large")
    instant = now or datetime.now(UTC)
    with session.begin():
        job = get_job_for_update(session, lease.job_id)
        if job is None:
            raise LookupError("Job not found")
        if (
            job.status != "running"
            or job.lease_token != lease.token
            or job.attempt_count != lease.attempt
            or job.lease_expires_at is None
            or job.lease_expires_at <= instant
        ):
            raise JobTransitionConflict("Job lease is no longer current")
        job.status = outcome
        job.result_summary = result_summary
        job.error_code = error_code
        job.finished_at = instant
        job.lease_token = None
        job.lease_expires_at = None
        session.flush()
        session.refresh(job)
    return job
