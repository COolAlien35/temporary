"""Internal job execution diagnostic; domain workers register here later."""

from uuid import UUID

from app.core.config import get_settings
from app.db.session import worker_session
from app.jobs.celery_app import celery_app
from app.modules.jobs.execution import claim_job, finish_job


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.jobs.probe", ignore_result=False, acks_late=False
)
def job_probe(job_id: str) -> str:
    """Exercise a fenced database result write without external side effects."""
    settings = get_settings()
    identifier = UUID(job_id)
    with worker_session() as session:
        lease = claim_job(
            session,
            identifier,
            lease_seconds=settings.task_time_limit + 1,
            retry_expired=True,
        )
    if lease is None:
        return "ignored"
    with worker_session() as session:
        finish_job(session, lease, "succeeded", result_summary={"diagnostic": "ok"})
    return "succeeded"
