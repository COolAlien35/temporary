from uuid import uuid4

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import get_engine, get_session
from app.jobs.celery_app import celery_app
from app.main import create_app

pytestmark = pytest.mark.integration


def test_database_is_at_migration_head():
    heads = ScriptDirectory.from_config(Config("alembic.ini")).get_heads()
    assert len(heads) == 1, "Resolve divergent migration heads before merging"
    with get_engine().connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == heads[0]


def test_database_session_rolls_back_uncommitted_writes():
    session_generator = get_session(get_engine())
    session = next(session_generator)
    # PostgreSQL transactional DDL means this table disappears on rollback.
    name = f"test_rollback_{uuid4().hex}"
    session.execute(text(f"CREATE TABLE {name} (value integer NOT NULL)"))
    session.execute(text(f"INSERT INTO {name} VALUES (42)"))
    session_generator.close()
    with get_engine().connect() as connection:
        assert connection.scalar(text("SELECT to_regclass(:name)"), {"name": name}) is None


def test_broker_and_cache_are_separate_servers():
    settings = get_settings()
    with Redis.from_url(settings.broker_url) as broker, Redis.from_url(settings.cache_url) as cache:
        assert broker.info("server")["run_id"] != cache.info("server")["run_id"]
        assert broker.config_get("maxmemory-policy")["maxmemory-policy"] == "noeviction"


def test_real_worker_round_trip():
    value = str(uuid4())
    result = celery_app.send_task("quantumloop.ping", args=[value], ignore_result=False)
    try:
        assert result.get(timeout=30) == value
    finally:
        result.forget()


def test_worker_uses_its_own_database_pool():
    with get_engine().connect() as connection:
        expected_database = connection.scalar(text("SELECT current_database()"))
    result = celery_app.send_task("quantumloop.db_ping", ignore_result=False)
    try:
        assert result.get(timeout=30) == expected_database
    finally:
        result.forget()


def test_readiness_with_real_services():
    with TestClient(create_app()) as client:
        assert client.get("/api/v1/health/ready").status_code == 200
