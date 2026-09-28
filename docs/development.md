# Development, Docker, and CI

## Current implementation boundary

The backend currently provides infrastructure and health endpoints only. Authentication, simulations, grading, tutor, storage, and collaboration are tracked in `backend_plan.md`. The frontend remains in its labeled demo mode until B20 connects implemented APIs. Starting both containers does not make the demo frontend a connected backend application.

## Prerequisites

- Docker Engine/Desktop with Compose v2 supporting `--wait` and conditional dependencies.
- Python 3.12 and uv 0.11.2 for native backend development.
- Node.js 22 and pnpm 10.13.1 for native frontend development.
- Internet access for first dependency/image/browser downloads and the frontend's existing Google Fonts build fetch.

Python dependencies are resolved in `backend/uv.lock`; frontend dependencies use `frontend/pnpm-lock.yaml`. Always use frozen installs in CI and containers. Base images pin runtime release lines; they are not immutable digest pins. Review Dependabot image updates and promote the tested release image digest for deployment.

## Start the local stack

From the repository root:

```sh
docker compose --profile web up --build --wait
```

This starts PostgreSQL, broker Redis, cache Redis, a one-shot migration, API, worker, and frontend. Migrations must finish successfully before the API/worker starts. Only localhost receives exposed service ports.

| Service | Local address |
| --- | --- |
| Frontend | http://localhost:3000 |
| API documentation | http://localhost:8000/docs |
| Liveness | http://localhost:8000/api/v1/health/live |
| Readiness | http://localhost:8000/api/v1/health/ready |
| PostgreSQL | localhost:5432 |
| Broker Redis | localhost:6379 |
| Cache Redis | localhost:6380 |

For backend-only development, use `docker compose up --build --wait api worker`. Stop using `docker compose down`; database and broker volumes are retained. Only use `down --volumes` when intentionally deleting local data. CI uses disposable volumes and cleans them after each run.

Override host port collisions with `API_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`, `BROKER_PORT`, and `CACHE_PORT`. Browser tests use a separate port 3100, configurable with `PLAYWRIGHT_PORT`, so they do not attach to your development server or frontend container.

The worker currently consumes all declared queues with concurrency 2 for local convenience. As simulation/grading integrations arrive, deploy separate workers with `--queues=simulation`, `--queues=optimization`, and `--queues=grading`, sized and tested for those workloads. Scale workers independently of API replicas. The Compose API publishes one host port and is not a multi-replica production load balancer.

## Native development

```sh
docker compose up --wait db broker cache
cd backend
cp .env.example .env
uv sync --frozen
uv run --frozen alembic upgrade head
uv run --frozen uvicorn app.main:app --reload
```

In another terminal under `backend/`, run `uv run --frozen celery -A app.jobs.celery_app:celery_app worker --loglevel=INFO --concurrency=2`. Run `pnpm dev` under `frontend/` for frontend development. API and frontend hot reload are intentionally native; the Docker images test the production launch path.

## Required test loop

After every major task: add behavior/acceptance tests, run its gate in the plan, investigate failures, fix the cause, and rerun the affected regression suites. Do not check off a task while required suites are failing or unavailable.

```sh
make backend-install
make backend-check backend-test
make test-integration
cd frontend
pnpm exec playwright install chromium
cd ..
make frontend-check
```

`make test-all` runs all checks once dependencies/browser are installed. The integration target builds current code, starts real services, runs all backend tests with an 85% branch-inclusive coverage threshold, checks migration drift, and writes `reports/backend.xml`. Services remain running for debugging; use `make down` afterward.

The frontend gate builds Next.js, runs TypeScript, and executes the existing Playwright suite against the production server. Automatic test retries are disabled. CI uploads browser HTML/JUnit reports, traces, and screenshots on failure. Current browser suites cover demo journeys; add connected multi-account suites with B20.

Production tests launch the same standalone entry point as Docker via `frontend/scripts/serve-standalone.mjs`. New local reports go to ignored `reports/frontend/`, avoiding changes to legacy tracked report files. See [the recorded verification results](verification.md) for the current baseline.

## Schema changes

Models live in their owning feature modules. Register their imports in `backend/migrations/env.py`, then generate and review a migration:

```sh
cd backend
uv run --frozen alembic revision --autogenerate -m 'describe the schema change'
uv run --frozen alembic upgrade head
uv run --frozen alembic check
```

The current baseline establishes Alembic tracking without inventing domain tables. Add migration tests from the previous release when domain schema evolves. Production migrations run once per release, not concurrently in every API replica. Prefer expand/migrate/contract changes and forward repairs; application rollback must remain compatible with the deployed schema.

## GitHub Actions

`CI` runs on pushes, pull requests, and manual invocation, and can be called by the publication workflow. Its jobs run backend static/unit checks, frontend build/type/browser checks, and a Docker integration stack. `Required checks` fails when any prerequisite fails, is cancelled, or is skipped. Workflows have read-only permissions unless publishing, and external actions use immutable commit references.

After pushing these files, enable a GitHub branch ruleset for the default branch that requires `Required checks`, a current branch, and review as appropriate. This repository setting cannot be enabled by adding YAML; it requires repository administrator access. Workflow files have been prepared locally; a hosted run starts only after they are pushed.

`Publish images` is manually triggered from the default branch. It first reruns the complete CI workflow for that commit, then publishes backend/frontend images to GHCR using the built-in `GITHUB_TOKEN`, tagged by commit SHA with provenance and SBOM. It does not deploy a provider or require cloud credentials. GitHub package policy must allow the token to publish. Deployment infrastructure remains B23 work once hosting is selected.

Select the digest of the built artifact for production promotion. The current publication workflow rebuilds from the verified source/lockfiles; digest promotion without rebuilding should replace this when a deployment environment is added. Protect production with its own environment rules and credentialed smoke tests.

## Operational boundaries

- Compose credentials are local defaults. Configure real database/broker/cache endpoints and provider secrets through the selected deployment platform. Never copy the development database password into production.
- Broker Redis uses AOF and `noeviction`; cache Redis is disposable and evictable. This does not replace PostgreSQL outbox/reconciliation and job durability work in B07.
- Celery result storage is short-lived diagnostic storage. Persist business results in PostgreSQL; only tasks whose idempotency/recovery is proven should opt into late acknowledgements.
- API readiness checks database and both Redis services; worker health is proven by the integration round trip, not merely by process startup. Add queue-age/heartbeat alerting with B21.
- Size PostgreSQL connections as `(API processes + DB-using worker processes) × (pool size + overflow)`, with headroom for migrations/operators. Configure managed database pooling before scaling.
- External credentials and real scientific/sandbox integrations remain explicit future acceptance gates. No empty or skipped tests represent those services as implemented.
