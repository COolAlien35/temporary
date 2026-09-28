from celery import Celery, signals
from kombu import Queue

from app.core.config import get_settings
from app.db.session import dispose_worker_database, initialize_worker_database


def on_worker_process_init(**_kwargs: object) -> None:
    initialize_worker_database()


def on_worker_process_shutdown(**_kwargs: object) -> None:
    dispose_worker_database()


signals.worker_process_init.connect(on_worker_process_init, weak=False)
signals.worker_process_shutdown.connect(on_worker_process_shutdown, weak=False)

settings = get_settings()
celery_app = Celery(
    "quantumloop",
    broker=settings.broker_url,
    backend=settings.result_backend,
    include=[
        "app.jobs.tasks",
        "app.modules.jobs.tasks",
        "app.modules.experiments.tasks",
        "app.modules.content.ingestion",
    ],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_default_queue="maintenance",
    task_queues=[Queue(name) for name in ("maintenance", "simulation", "optimization", "grading")],
    task_create_missing_queues=False,
    task_routes={
        "quantumloop.ping": {"queue": "maintenance"},
        "quantumloop.db_ping": {"queue": "maintenance"},
        "quantumloop.jobs.probe": {"queue": "maintenance"},
        "quantumloop.experiments.run_aer": {"queue": "simulation"},
        "quantumloop.content.reindex": {"queue": "maintenance"},
    },
    task_ignore_result=True,
    result_expires=300,  # Diagnostic receipts only; feature results belong in PostgreSQL.
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        "visibility_timeout": settings.broker_visibility_timeout,
        "socket_timeout": 3,
        "socket_connect_timeout": 3,
    },
    result_backend_transport_options={"visibility_timeout": settings.broker_visibility_timeout},
    visibility_timeout=settings.broker_visibility_timeout,
    task_soft_time_limit=settings.task_soft_time_limit,
    task_time_limit=settings.task_time_limit,
    timezone="UTC",
    enable_utc=True,
)
