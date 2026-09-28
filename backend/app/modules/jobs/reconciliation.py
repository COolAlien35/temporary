"""Recover expired local job leases without blindly replaying external work."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.modules.jobs.outbox import REPLAY_SAFE_TASKS
from app.modules.jobs.repository import (
    expired_jobs_for_update,
    get_job_for_update,
    stale_unclaimed_jobs_for_update,
)

MAX_BATCH = 20
MAX_LOCAL_ATTEMPTS = 3
MAX_UNCLAIMED_PUBLICATIONS = 3


@dataclass(frozen=True)
class ReconcileResult:
    requeued: int = 0
    timed_out: int = 0
    unknown: int = 0


def reconcile_expired(
    session: Session,
    *,
    now: datetime | None = None,
    limit: int = MAX_BATCH,
    max_attempts: int = MAX_LOCAL_ATTEMPTS,
) -> ReconcileResult:
    """Requeue only replay-safe tasks; make uncertain outcomes visible."""
    if not 1 <= limit <= MAX_BATCH:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH}")
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    instant = now or datetime.now(UTC)
    requeued = timed_out = unknown = 0
    with session.begin():
        for message, selected_job in expired_jobs_for_update(session, instant, limit):
            job = get_job_for_update(session, selected_job.id)
            if (
                job is None
                or job.status != "running"
                or job.lease_expires_at is None
                or job.lease_expires_at > instant
            ):
                continue
            job.lease_token = None
            job.lease_expires_at = None
            if message.task_name in REPLAY_SAFE_TASKS:
                if job.attempt_count < max_attempts:
                    job.status = "queued"
                    message.published_at = None
                    message.discarded_at = None
                    message.next_attempt_at = instant
                    message.last_error_code = None
                    requeued += 1
                else:
                    job.status = "timed_out"
                    job.error_code = "attempt_limit"
                    job.finished_at = instant
                    message.discarded_at = instant
                    timed_out += 1
            else:
                job.status = "unknown"
                job.error_code = "reconciliation_required"
                message.discarded_at = instant
                unknown += 1
    return ReconcileResult(requeued=requeued, timed_out=timed_out, unknown=unknown)


def reconcile_unclaimed(
    session: Session,
    *,
    grace_seconds: int,
    now: datetime | None = None,
    limit: int = MAX_BATCH,
    max_publications: int = MAX_UNCLAIMED_PUBLICATIONS,
) -> ReconcileResult:
    """Recover a published job that no worker claimed within the grace window."""
    if grace_seconds < 1 or max_publications < 1:
        raise ValueError("Grace period and publication limit must be positive")
    if not 1 <= limit <= MAX_BATCH:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH}")
    instant = now or datetime.now(UTC)
    cutoff = instant - timedelta(seconds=grace_seconds)
    requeued = timed_out = unknown = 0
    with session.begin():
        for message, selected_job in stale_unclaimed_jobs_for_update(session, cutoff, limit):
            job = get_job_for_update(session, selected_job.id)
            if (
                job is None
                or job.status != "queued"
                or job.lease_token is not None
                or message.discarded_at is not None
                or message.published_at is None
                or message.published_at > cutoff
            ):
                continue
            if message.task_name in REPLAY_SAFE_TASKS:
                if message.publication_count < max_publications:
                    message.published_at = None
                    message.next_attempt_at = instant
                    message.last_error_code = None
                    requeued += 1
                else:
                    job.status = "timed_out"
                    job.error_code = "start_timeout"
                    job.finished_at = instant
                    message.discarded_at = instant
                    timed_out += 1
            else:
                job.status = "unknown"
                job.error_code = "reconciliation_required"
                message.discarded_at = instant
                unknown += 1
    return ReconcileResult(requeued=requeued, timed_out=timed_out, unknown=unknown)
