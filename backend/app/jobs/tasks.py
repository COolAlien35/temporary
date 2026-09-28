from app.jobs.celery_app import celery_app


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.ping", ignore_result=False, acks_late=True, reject_on_worker_lost=True
)
def ping(value: str) -> str:
    """Diagnostic round trip through a real worker; no public submission endpoint."""
    return value
