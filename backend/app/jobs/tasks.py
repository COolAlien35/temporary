from sqlalchemy import text

from app.db.session import worker_session
from app.jobs.celery_app import celery_app


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.ping", ignore_result=False, acks_late=True, reject_on_worker_lost=True
)
def ping(value: str) -> str:
    """Diagnostic round trip through a real worker; no public submission endpoint."""
    return value


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.db_ping", ignore_result=False, acks_late=True, reject_on_worker_lost=True
)
def db_ping() -> str:
    """Diagnostic query proving a prefork worker can use its own PostgreSQL pool."""
    with worker_session() as session:
        database = session.scalar(text("SELECT current_database()"))
        assert isinstance(database, str)
        return database
