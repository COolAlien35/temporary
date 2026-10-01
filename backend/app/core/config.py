from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="QL_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://quantumloop:quantumloop@localhost:5432/quantumloop"
    broker_url: str = "redis://localhost:6379/0"
    cache_url: str = "redis://localhost:6380/0"
    result_backend: str = "redis://localhost:6380/1"
    auth_issuer: str | None = None
    auth_audience: str = "authenticated"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    max_request_body_bytes: int = Field(default=262_144, ge=1024, le=10_485_760)
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_max_overflow: int = Field(default=5, ge=0, le=50)
    worker_db_pool_size: int = Field(default=2, ge=1, le=20)
    worker_db_max_overflow: int = Field(default=0, ge=0, le=20)
    task_soft_time_limit: int = Field(default=240, gt=0)
    task_time_limit: int = Field(default=300, gt=0)
    broker_visibility_timeout: int = Field(default=600, gt=0)
    tutor_api_key: str = ""
    tutor_base_url: str = "https://api.openai.com/v1"
    tutor_model: str = "gpt-5.4-mini"
    tutor_timeout_seconds: int = Field(default=15, ge=1, le=60)
    tutor_max_completion_tokens: int = Field(default=256, ge=64, le=1024)
    tutor_daily_request_limit: int = Field(default=20, ge=1, le=100)
    simulation_daily_run_limit: int = Field(default=100, ge=1, le=10_000)
    embedding_model: str = Field(
        default="text-embedding-3-small", validation_alias="EMBEDDING_MODEL"
    )
    embedding_dim: int = Field(default=1536, validation_alias="EMBEDDING_DIM", gt=0)
    embedding_api_key: str = Field(default="", validation_alias="EMBEDDING_API_KEY")
    embedding_base_url: str = Field(
        default="https://api.openai.com/v1", validation_alias="EMBEDDING_BASE_URL"
    )

    @model_validator(mode="after")
    def validate_configuration(self) -> "Settings":
        if not self.database_url.startswith("postgresql+psycopg://"):
            raise ValueError("QL_DATABASE_URL must use postgresql+psycopg")
        if not self.task_soft_time_limit < self.task_time_limit < self.broker_visibility_timeout:
            raise ValueError("Require soft time limit < hard time limit < visibility timeout")
        if "*" in self.cors_origins:
            raise ValueError("CORS origins must be explicit")
        if self.environment == "production":
            if not self.auth_issuer:
                raise ValueError("Production requires QL_AUTH_ISSUER")
            if "quantumloop:quantumloop@" in self.database_url:
                raise ValueError("Production requires a configured database credential")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")
        if self.auth_issuer and (
            not self.auth_issuer.startswith("https://") or not self.auth_issuer.endswith("/auth/v1")
        ):
            raise ValueError("QL_AUTH_ISSUER must be a Supabase HTTPS auth/v1 issuer")
        if not self.tutor_base_url.startswith("https://"):
            raise ValueError("QL_TUTOR_BASE_URL must use HTTPS")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
