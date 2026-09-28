from celery import Celery
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "quantumloop",
    broker=settings.broker_url,
    backend=settings.result_backend,
    include=["app.jobs.tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_default_queue="maintenance",
    task_queues=[Queue(name) for name in ("maintenance", "simulation", "optimization", "grading")],
    task_create_missing_queues=False,
    task_routes={"quantumloop.ping": {"queue": "maintenance"}},
    task_ignore_result=True,
    result_expires=300,  # Diagnostic receipts only; feature results belong in PostgreSQL.
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    broker_transport_options={"visibility_timeout": settings.broker_visibility_timeout},
    result_backend_transport_options={"visibility_timeout": settings.broker_visibility_timeout},
    visibility_timeout=settings.broker_visibility_timeout,
    task_soft_time_limit=settings.task_soft_time_limit,
    task_time_limit=settings.task_time_limit,
    timezone="UTC",
    enable_utc=True,
)
