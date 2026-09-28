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
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    db_pool_size: int = Field(default=5, ge=1, le=50)
    db_max_overflow: int = Field(default=5, ge=0, le=50)
    task_soft_time_limit: int = Field(default=240, gt=0)
    task_time_limit: int = Field(default=300, gt=0)
    broker_visibility_timeout: int = Field(default=600, gt=0)

    @model_validator(mode="after")
    def validate_configuration(self) -> "Settings":
        if not self.database_url.startswith("postgresql+psycopg://"):
            raise ValueError("QL_DATABASE_URL must use postgresql+psycopg")
        if not self.task_soft_time_limit < self.task_time_limit < self.broker_visibility_timeout:
            raise ValueError("Require soft time limit < hard time limit < visibility timeout")
        if "*" in self.cors_origins:
            raise ValueError("CORS origins must be explicit")
        if self.environment == "production":
            if "quantumloop:quantumloop@" in self.database_url:
                raise ValueError("Production requires a configured database credential")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
