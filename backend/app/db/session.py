from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache

from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings


def build_engine(
    settings: Settings, *, pool_size: int | None = None, max_overflow: int | None = None
) -> Engine:
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size if pool_size is None else pool_size,
        max_overflow=settings.db_max_overflow if max_overflow is None else max_overflow,
        pool_timeout=5,
        connect_args={"connect_timeout": 3, "options": "-c statement_timeout=5000"},
    )


@lru_cache
def get_engine() -> Engine:
    """API/migration engine; API apps dispose their own engine on shutdown."""
    return build_engine(get_settings())


@lru_cache
def get_worker_engine() -> Engine:
    """Worker-only engine. Celery initializes it in each child after fork."""
    settings = get_settings()
    return build_engine(
        settings,
        pool_size=settings.worker_db_pool_size,
        max_overflow=settings.worker_db_max_overflow,
    )


def initialize_worker_database() -> None:
    """Replace an inherited pool without closing the parent's connections."""
    if get_worker_engine.cache_info().currsize:
        get_worker_engine().dispose(close=False)
        get_worker_engine.cache_clear()
    get_worker_engine()


def dispose_worker_database() -> None:
    if get_worker_engine.cache_info().currsize:
        get_worker_engine().dispose()
        get_worker_engine.cache_clear()


@contextmanager
def worker_session() -> Iterator[Session]:
    """A task owns its session; domain services still own commit/rollback boundaries."""
    with Session(get_worker_engine(), expire_on_commit=False) as session:
        yield session


def get_session(engine: Engine = Depends(get_engine)) -> Iterator[Session]:  # noqa: B008
    # Services own transactions explicitly with session.begin(); never auto-commit on teardown.
    with Session(engine, expire_on_commit=False) as session:
        yield session
