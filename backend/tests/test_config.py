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
    )
    assert settings.environment == "production"
