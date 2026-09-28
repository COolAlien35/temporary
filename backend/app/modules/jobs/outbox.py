"""Transactional job dispatch and at-least-once broker publication."""

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from kombu.exceptions import OperationalError
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.jobs.celery_app import celery_app
from app.modules.identity.public import Actor
from app.modules.jobs.models import Job, JobOutbox
from app.modules.jobs.repository import due_outbox_for_update
from app.modules.jobs.schemas import JobKind
from app.modules.jobs.service import QUEUE_FOR_KIND

logger = logging.getLogger(__name__)
MAX_PAYLOAD_BYTES = 16_384
MAX_BATCH = 20
Publisher = Callable[[JobOutbox, Job], None]

# Add a task here only after its worker behavior and retry policy have been tested.
TASK_KIND: dict[str, JobKind] = {
    "quantumloop.jobs.probe": "export",
    "quantumloop.experiments.run_aer": "simulation",
}
REPLAY_SAFE_TASKS = frozenset(TASK_KIND)


@dataclass(frozen=True)
class DispatchResult:
    published: int = 0
    retried: int = 0
    discarded: int = 0


def create_dispatchable_job(
    session: Session,
    actor: Actor,
    *,
    kind: JobKind,
    task_name: str,
    payload: dict[str, object] | None = None,
) -> Job:
    """Commit a job and one dispatch intent atomically; no broker call occurs here."""
    with session.begin():
        job = enqueue_job(session, actor, kind=kind, task_name=task_name, payload=payload)
        session.refresh(job)
    return job


def enqueue_job(
    session: Session,
    actor: Actor,
    *,
    kind: JobKind,
    task_name: str,
    payload: dict[str, object] | None = None,
) -> Job:
    """Stage a job and outbox intent in the caller's active transaction."""
    if TASK_KIND.get(task_name) != kind:
        raise ValueError("Task is not registered for this job kind")
    task_payload = payload or {}
    if "job_id" in task_payload:
        raise ValueError("Job ID is server assigned")
    if task_name == "quantumloop.jobs.probe" and task_payload:
        raise ValueError("The job diagnostic takes no payload")
    job = Job(owner_id=actor.id, kind=kind, queue=QUEUE_FOR_KIND[kind], status="queued")
    session.add(job)
    session.flush()
    stored_payload = {"job_id": str(job.id), **task_payload}
    try:
        encoded = json.dumps(stored_payload, allow_nan=False).encode()
    except (TypeError, ValueError):
        raise ValueError("Task payload must be finite JSON") from None
    if len(encoded) > MAX_PAYLOAD_BYTES:
        raise ValueError("Task payload is too large")
    session.add(JobOutbox(job_id=job.id, task_name=task_name, payload=stored_payload))
    session.flush()
    return job


def publish_to_celery(message: JobOutbox, job: Job) -> None:
    """Use a stable task ID so workers can fence duplicate deliveries by job ID."""
    celery_app.send_task(
        message.task_name,
        task_id=str(job.id),
        queue=job.queue,
        kwargs=message.payload,
        retry=False,
        ignore_result=False,
    )


def dispatch_pending(
    session: Session,
    *,
    publisher: Publisher = publish_to_celery,
    limit: int = MAX_BATCH,
    now: datetime | None = None,
) -> DispatchResult:
    """Claim due rows with row locks, publish, and record delivery or retry."""
    if not 1 <= limit <= MAX_BATCH:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH}")
    instant = now or datetime.now(UTC)
    published = retried = discarded = 0
    with session.begin():
        rows = due_outbox_for_update(session, instant, limit)
        for message, job in rows:
            if job.status in {"succeeded", "failed", "cancelled", "timed_out"}:
                message.discarded_at = instant
                discarded += 1
                continue
            if job.status in {"running", "unknown"}:
                # A worker started after publish but before the outbox commit.
                message.published_at = instant
                published += 1
                continue
            try:
                publisher(message, job)
            except (OperationalError, RedisError, OSError, TimeoutError):
                message.attempts += 1
                message.last_error_code = "broker_unavailable"
                message.next_attempt_at = instant + timedelta(
                    seconds=min(300, 2 ** min(message.attempts, 8))
                )
                retried += 1
                logger.warning("Job dispatch deferred for %s", job.id)
                break  # Avoid hammering a broker that is currently unavailable.
            message.attempts += 1
            message.publication_count += 1
            message.published_at = instant
            message.last_error_code = None
            published += 1
    return DispatchResult(published=published, retried=retried, discarded=discarded)
