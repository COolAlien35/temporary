# Development, Docker, and CI

For the hosted learner slice, see the [Render and Supabase deployment runbook](deployment.md). The Blueprint is prepared but has not been applied to live services.

## Current implementation boundary

The backend provides infrastructure, health endpoints, Supabase JWT verification, durable `GET/PATCH /api/v1/me` profiles, cohort membership/invitation APIs, a read-only learner-safe curriculum unit API, learner-owned lesson sessions and locked predictions, owner-scoped circuit revisions and a paginated circuit library, and local Qiskit Aer simulations through durable jobs. A locked prediction can bind to one exact owned run, and `GET /api/v1/predictions/{id}/pair` derives agreement from a successful persisted result. `GET /api/v1/learning-sessions/{id}/agreement-history` exposes bounded successful-pair context for the tutor. Frontend Supabase signup/login and password recovery are opt-in, while account workflows, noise, grading, storage, and collaboration remain tracked in `backend_plan.md`. Most frontend pages still use labeled browser demo services; starting both containers does not connect those pages to the backend.

[API contract revision 1](api-contract.md) records shared wire conventions and labels implemented and planned endpoints separately. Profile edits require the ETag from `GET /api/v1/me` in `If-Match`; stale saves return `412`. Circuit creates and simulation submissions use UUID idempotency keys. Circuit/run routes are owner-scoped. Idempotency and cursor pagination have not yet been added to existing cohort routes.

New Aer run submissions have a configurable per-account UTC-day cap (`QL_SIMULATION_DAILY_RUN_LIMIT`, default 100). Existing idempotency keys replay without using more quota; excess new submissions return `429` with `Retry-After` until the next UTC day.

`frontend/lib/services/learning-loop-api.ts` is an opt-in client for the implemented learning-loop routes. Its write methods require caller-owned UUID idempotency keys so retries can reuse the same key. `frontend/lib/services/connected-auth.ts` binds it to a current Supabase access token, separate from demo session storage. Connected Superposition saves an immutable prediction and lesson session when the learner locks Predict; Run reuses that lock, saves or selects the exact circuit revision, submits the paired Aer run, and polls it. An unpaired saved prediction can be recovered after a lost local draft by searching at most 50 owned sessions and 50 predictions per session. The Build stage can list, create, reopen, and revise owned two-qubit circuits; updates use `If-Match`, and opening a circuit replaces the local editor gates. The verified pair appears in Observe, with run-bound tutor context in Explain. A `?stage=5&run=<UUID>` link resolves the exact owned saved run after reload; recent-pair recovery uses the same bounded discovery window. Observe shows server agreement, provenance, numeric and visual comparisons, and stale-editor/low-shot notices. Other labs and most pages remain browser demo journeys; this connected path has not yet been verified against live Supabase credentials or two real accounts.

Connected users see a focused home screen linking to the implemented Superposition lab and account settings. The connected curriculum index reads learner-safe units from the backend and links its supported Superposition lesson to the lab. These screens do not display demo XP, streak, or completion metrics; connected visits to legacy demo-scored curriculum lessons and quizzes show a link to the saved lab instead. The other learning areas are labeled as demo experiences. The local demo home and curriculum retain their existing dashboards.

Connected Settings loads the owned `/me` profile, saves name and learning preferences with the profile revision in `If-Match`, and reloads the latest values after a `412` conflict. Sign-in and browser-session restore hydrate account preferences for the rest of the UI. Demo settings remain local to the browser.

Once the run is accepted, Run exposes its saved status link during polling. Learners can browse owner-scoped saved Aer runs in pages and open a run whose prediction belongs to the connected Superposition lesson. Connected Superposition shows the server agreement in the lab header. Debug, Challenge, and Master are unavailable in connected mode until their grading is trusted; local visualization tabs are withheld because they do not describe the saved Aer run. Demo mode retains those practice screens.

Connected Superposition Learn reads its lesson sections and takeaways from the learner-safe `/curriculum/units/u1` response. Observe includes a numeric history of saved prediction agreement and separately labeled self-rated confidence, basis, and shots. This history is not a statistical confidence-calibration score.

The guided Build grid also exposes a synchronized, time-ordered gate table with keyboard focus and removal actions. This covers the supported lab builder; the wider Studio keyboard and screen-reader acceptance gate remains open.

When a learner selects a saved circuit in Build, Run submits that circuit's immutable revision if its gates still match the editor. Editing the draft causes Run to save a new circuit snapshot before submission. The backend checks circuit ownership and revision during submission.

The API rejects request bodies larger than `QL_MAX_REQUEST_BODY_BYTES` (default 262,144 bytes) with a structured 413 response, including for chunked transfers. This cap applies before route validation; route-specific circuit, prediction, and tutor limits remain in force.

The deployed API logs a bounded request record with `X-Request-ID`, method, route template, status, and elapsed milliseconds. Raw URLs, query values, bearer tokens, and request bodies are excluded. The API image disables Uvicorn's raw-URL access log; use `--no-access-log` for native Uvicorn runs as shown below.

To enable connected accounts, copy `frontend/.env.example` to `frontend/.env.local` for native development and set the Supabase project URL, **publishable** key, and browser-reachable API origin. The API origin is the root URL, for example `http://127.0.0.1:8000`, without `/api/v1`. Also set `QL_AUTH_ISSUER` and optionally `QL_AUTH_AUDIENCE` in the backend environment. For Compose, put these variables in the root `.env`; the frontend values are build arguments, so rebuild the frontend image after changing them. Set the Supabase email redirect allow list to include both the frontend `/login` URL and `/reset-password?connected=1` URL. Never put a service-role key in `NEXT_PUBLIC_*`. Without all three public frontend values, signup and login use local demo mode and the Supabase choice is disabled. With them, signup defaults to Supabase and preserves the submitted name in the initial backend profile; users can explicitly choose Local demo. Provider signup can require email confirmation; the UI waits for confirmation instead of creating a false connected session. Supabase session refresh, password recovery, and logout are handled by its browser SDK; connected identity comes from the backend `/me` response. Live multi-account verification is still pending.

For authenticated API requests, set `QL_AUTH_ISSUER` to the Supabase project's HTTPS issuer ending in `/auth/v1` and use an asymmetric Supabase signing key so the API can verify access tokens through the issuer's JWKS endpoint. The audience defaults to `authenticated`; configure `QL_AUTH_AUDIENCE` if the project uses another value. The API reads learner/instructor roles only from PostgreSQL profiles, never from client input or a JWT role claim. Local Compose leaves auth unconfigured, so `/api/v1/me` returns 503 for bearer tokens until an issuer is configured.

After an instructor signs in once, an operator with database access can grant the global instructor role:

```sh
docker compose run --rm api python -m app.modules.identity.provision_instructor \
  --subject 00000000-0000-0000-0000-000000000000 \
  --operator YOUR_OPERATOR_ID --reason 'approved instructor' --apply
```

The command requires `--apply`, logs the operator and reason, and cannot promote an unknown subject. No user-facing endpoint grants instructor status. A provisioned instructor can create a cohort with `POST /api/v1/cohorts`; its owner can assign another provisioned instructor with `PUT /api/v1/cohorts/{id}/instructors/{profile_id}`. An instructor member creates a learner invitation with `POST /api/v1/cohorts/{id}/invitations`; the response contains the token once for manual delivery. The API stores only its hash, accepts it through `POST /api/v1/cohort-invitations/accept` for the verified matching email, and permits revocation. Automatic invitation email delivery is not implemented.

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

The worker uses a dedicated image containing Qiskit Aer; API and migration images omit quantum SDKs. The local worker consumes all declared queues at concurrency 2 for convenience. As grading and optimization arrive, deploy queue-specific workers with resource limits. Scale workers independently of API replicas. The Compose API publishes one host port and is not a multi-replica production load balancer.

The tutor API loads owner-scoped lesson, circuit revision, paired run, and bounded prediction agreement context. Its coordinator selects one of three fixed roles and makes at most one OpenAI-compatible Chat Completions call, with a 1,000-character learner prompt, 12,000-character serialized context, configured timeout, and output-token cap. Configure `QL_TUTOR_API_KEY` only on the server; `QL_TUTOR_BASE_URL`, `QL_TUTOR_MODEL`, `QL_TUTOR_TIMEOUT_SECONDS`, `QL_TUTOR_MAX_COMPLETION_TOKENS`, and `QL_TUTOR_DAILY_REQUEST_LIMIT` are in `backend/.env.example`. Authenticated messages are grouped by learning session and saved with role, prompt version, model, and source record IDs. The API reserves a daily request slot and an idempotency key before making the provider call. Streaming, token/cost accounting, retention cleanup, and live provider validation remain open; the frontend tutor remains a demo.
Build-stage explanations with a saved circuit route to the Circuit Debugger; run errors and changed/unexpected/optimize/generate actions do too. Planning requests route to the Analytics Planner, while other explanations use the Pedagogical Guide. Run context includes a bounded count/probability preview, an Aer capability list, and a normalized error code; statevectors and raw exception text are excluded.
Planner candidates are limited to the authorized current lesson and its catalog-listed tool links. The model receives candidate IDs and labels, then returns an ID and reason; the backend supplies the actual link and falls back deterministically on missing history or invalid output. Cross-lesson and challenge recommendations await verified prerequisite and eligibility records.

The jobs module has a PostgreSQL record, explicit state transitions, and an owner-scoped status read. Its internal `create_dispatchable_job` service commits the job and a single outbox intent together. Run one dispatcher process with `python -m app.modules.jobs.dispatcher`; Compose starts it as the `dispatcher` service. It claims due intents with PostgreSQL row locks, publishes with a stable job/task ID, and backs off after a broker error. Delivery is at least once: a crash after broker acceptance but before the outbox commit can publish twice. The diagnostic and local Aer worker tasks claim timed database leases, record their results, and ignore duplicate delivery; an expired worker cannot overwrite a newer attempt. On each dispatcher pass, expired running jobs and published jobs that no worker claimed are reconciled before publication. The diagnostic and local Aer tasks are approved for replay, up to three worker attempts or three successful publications. The unclaimed-job grace period uses the configured broker visibility timeout. Work without that replay policy enters `unknown` for manual/provider reconciliation. Provider submissions must not inherit local Aer replay behavior without their own idempotency proof.

API and worker database pools are configured independently with `QL_DB_POOL_SIZE`/`QL_DB_MAX_OVERFLOW` and `QL_WORKER_DB_POOL_SIZE`/`QL_WORKER_DB_MAX_OVERFLOW`. Celery creates its PostgreSQL engine in each prefork child and disposes it when that child exits. Worker tasks use `worker_session()`; domain services still own commits and rollbacks. The `quantumloop.db_ping` maintenance task is an internal integration diagnostic for this path.

## Native development

```sh
docker compose up --wait db broker cache
cd backend
cp .env.example .env
uv sync --frozen
uv run --frozen alembic upgrade head
uv run --frozen uvicorn app.main:app --reload --no-access-log
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

Enable a GitHub branch ruleset for the default branch that requires `Required checks`, a current branch, and review as appropriate. This repository setting cannot be enabled by adding YAML; it requires repository administrator access. The workflow is pushed and its latest run passed, but the ruleset is still absent.

As of 2026-10-01, the current GitHub account has push access but no repository administrator access, and `main` has no branch protection or ruleset. An administrator must enable the `Required checks` rule in repository settings before it becomes an enforced merge gate.

`Publish images` is manually triggered from the default branch. It first reruns the complete CI workflow for that commit, then publishes backend/frontend images to GHCR using the built-in `GITHUB_TOKEN`, tagged by commit SHA with provenance and SBOM. It does not deploy a provider or require cloud credentials. GitHub package policy must allow the token to publish. Deployment infrastructure remains B23 work once hosting is selected.

Select the digest of the built artifact for production promotion. The current publication workflow rebuilds from the verified source/lockfiles; digest promotion without rebuilding should replace this when a deployment environment is added. Protect production with its own environment rules and credentialed smoke tests.

## Operational boundaries

- Compose credentials are local defaults. Configure real database/broker/cache endpoints and provider secrets through the selected deployment platform. Never copy the development database password into production.
- Broker Redis uses AOF and `noeviction`; cache Redis is disposable and evictable. This does not replace PostgreSQL outbox/reconciliation and job durability work in B07.
- Celery result storage is short-lived diagnostic storage. Persist business results in PostgreSQL; only tasks whose idempotency/recovery is proven should opt into late acknowledgements.
- API readiness checks database and both Redis services; worker health is proven by the integration round trip, not merely by process startup. Add queue-age/heartbeat alerting with B21.
- Size PostgreSQL connections as `API processes × (API pool size + API overflow) + DB-using worker children × (worker pool size + worker overflow)`, with headroom for migrations/operators. The development defaults are 5+5 per API process and 2+0 per worker child; configure managed database pooling before scaling.
- External credentials and real scientific/sandbox integrations remain explicit future acceptance gates. No empty or skipped tests represent those services as implemented.
