import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.parametrize(
    "overrides",
    [
        {"database_url": "sqlite:///test.db"},
        {"cors_origins": ["*"]},
        {"task_soft_time_limit": 301},
        {"broker_visibility_timeout": 100},
        {"db_pool_size": 0},
        {"worker_db_pool_size": 0},
        {"worker_db_max_overflow": -1},
        {"max_request_body_bytes": 1023},
        {"simulation_daily_run_limit": 0},
        {"environment": "production"},
        {"environment": "production", "database_url": "postgresql+psycopg://user:pass@db/prod"},
    ],
)
def test_invalid_configuration_fails_at_startup(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)


def test_production_accepts_explicit_configuration():
    settings = Settings(
        _env_file=None,
        environment="production",
        database_url="postgresql+psycopg://user:pass@db/prod",
        cors_origins=["https://app.example.test"],
        auth_issuer="https://example.supabase.co/auth/v1",
    )
    assert settings.environment == "production"
