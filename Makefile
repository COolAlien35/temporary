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
	cd frontend && pnpm hardware:check
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

.PHONY: test-parties
test-parties:
	cd frontend && QL_DATABASE_URL="$${QL_DATABASE_URL:-postgresql+psycopg://quantumloop:quantumloop@localhost:$${POSTGRES_PORT:-5432}/quantumloop}" QL_BROKER_URL="$${QL_BROKER_URL:-redis://localhost:$${BROKER_PORT:-6379}/0}" QL_CACHE_URL="$${QL_CACHE_URL:-redis://localhost:$${CACHE_PORT:-6380}/0}" pnpm test:parties

.PHONY: deployment-check release-check recovery-drill
deployment-check:
	cd backend && PYTHONPATH=. uv run --frozen python scripts/check_deployment.py
	cd frontend && node --test scripts/check-release-config.test.mjs
	docker compose --profile web --profile test config --quiet

release-check:
	$(MAKE) -j1 deployment-check backend-check backend-test test-integration frontend-check test-parties recovery-drill

recovery-drill:
	python3 scripts/recovery_drill.py
