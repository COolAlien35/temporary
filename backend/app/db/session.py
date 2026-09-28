from collections.abc import Iterator
from functools import lru_cache

from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings


def build_engine(settings: Settings) -> Engine:
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=5,
        connect_args={"connect_timeout": 3, "options": "-c statement_timeout=5000"},
    )


@lru_cache
def get_engine() -> Engine:
    """Process-local engine for migration/worker use; initialize after worker fork."""
    return build_engine(get_settings())


def get_session(engine: Engine = Depends(get_engine)) -> Iterator[Session]:  # noqa: B008
    # Services own transactions explicitly with session.begin(); never auto-commit on teardown.
    with Session(engine, expire_on_commit=False) as session:
        yield session
