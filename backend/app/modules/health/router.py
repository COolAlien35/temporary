import logging

from fastapi import APIRouter, Depends, HTTPException
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings, get_settings
from app.db.session import get_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


def check_dependencies(engine: Engine, settings: Settings) -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    for url in (settings.broker_url, settings.cache_url):
        with Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2) as client:
            client.ping()


@router.get("/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
def ready(
    settings: Settings = Depends(get_settings),  # noqa: B008
    engine: Engine = Depends(get_engine),  # noqa: B008
) -> dict[str, str]:
    try:
        check_dependencies(engine, settings)
    except (SQLAlchemyError, RedisError):
        # Avoid leaking connection strings or provider exception details to the caller or logs.
        logger.warning("readiness_dependency_unavailable")
        raise HTTPException(status_code=503, detail="Dependencies unavailable") from None
    return {"status": "ready"}
