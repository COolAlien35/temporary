.PHONY: backend-install backend-check backend-test frontend-check test-integration test-all up down

backend-install:
	cd backend && uv sync --frozen

backend-check:
	cd backend && uv run --frozen ruff check .
	cd backend && uv run --frozen ruff format --check .
	cd backend && uv run --frozen mypy

backend-test:
	cd backend && uv run --frozen pytest -m "not integration"

frontend-check:
	cd frontend && pnpm install --frozen-lockfile
	cd frontend && pnpm build
	cd frontend && pnpm exec tsc --noEmit
	cd frontend && PLAYWRIGHT_PRODUCTION=1 pnpm test:e2e

test-integration:
	docker compose up --build --wait api worker
	docker compose --profile test run --build --rm test
	docker compose run --rm migrate alembic check

test-all: backend-check backend-test test-integration frontend-check

up:
	docker compose --profile web up --build --wait

down:
	docker compose down
