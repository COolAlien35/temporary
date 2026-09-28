# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1 PATH="/app/.venv/bin:$PATH"
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.11.2 /uv /usr/local/bin/uv
COPY backend/pyproject.toml backend/uv.lock ./

FROM base AS test
RUN uv sync --frozen --group quantum --no-install-project
COPY backend/ .
COPY content ./content
CMD ["uv", "run", "--no-sync", "pytest", "-m", "not integration"]

FROM base AS build
RUN uv sync --frozen --no-dev --no-install-project

FROM base AS quantum-build
RUN uv sync --frozen --no-dev --group quantum --no-install-project

FROM python:3.12-slim-bookworm AS runtime-common
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH"
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
COPY --chown=app:app backend/app ./app
COPY --chown=app:app backend/migrations ./migrations
COPY --chown=app:app backend/alembic.ini ./
COPY --chown=app:app content ./content
USER app

FROM runtime-common AS runtime
COPY --from=build /app/.venv /app/.venv
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM runtime-common AS worker
COPY --from=quantum-build /app/.venv /app/.venv
CMD ["celery", "-A", "app.jobs.celery_app:celery_app", "worker", "--loglevel=INFO", "--queues=maintenance,simulation,optimization,grading", "--concurrency=2"]
