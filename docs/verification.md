# Infrastructure verification — 2026-09-28

Latest release-preparation results and remaining hosted checks: [deployment-readiness.md](deployment-readiness.md).

These results cover the infrastructure scaffold and existing frontend. They do not certify the future feature modules in `backend_plan.md`.

| Check | Result |
| --- | --- |
| Backend dependency lock consistency | `uv lock --check` passed; 58 resolved packages |
| Backend Ruff lint/format and strict mypy | Passed |
| Backend unit/architecture/configuration/API tests | 19 passed |
| Complete backend suite in Docker with PostgreSQL, two Redis servers, and Celery | 24 passed; 93.59% measured coverage; threshold 85% |
| Repeated migration upgrade and Alembic schema drift | Passed; no new upgrade operations |
| Backend and frontend runtime Docker images | Built and reached healthy state |
| Frontend production build and TypeScript | Passed |
| Existing frontend Playwright suite using standalone production server | 93 passed, no retries |
| GitHub Actions workflow validation | Actionlint 1.7.7 passed |

The backend integration suite includes a real Redis/Celery round trip, PostgreSQL rollback behavior, database migration head, broker/cache isolation, and API readiness. The coverage process does not instrument the separate worker or migration process; those paths are exercised through integration checks.

The test run emitted one upstream Starlette warning about future `httpx` TestClient support; it is not suppressed and did not fail tests. Reassess it during dependency updates. Local containers ran on Docker Desktop; GitHub's hosted Linux runner is a separate execution environment and has not run these workflow files yet.

Local port 6379 was already in use, so Docker checks used `BROKER_PORT=16379`. Browser tests use dedicated port 3100. If running the backend natively against a remapped container port, update the corresponding `QL_BROKER_URL`/database/cache setting too.

New reports live under ignored `reports/`, including backend JUnit and frontend HTML/JUnit/results. Previously tracked generated Playwright reports were restored after testing; subsequent runs now write outside those tracked directories.

Implementation defects found and fixed during this task: pytest import-path setup, concurrent Docker export tag collisions, per-application database pool configuration, browser-test port conflicts, and production test-server entry-point mismatch. A regression test covers custom app settings selecting the correct pool.

Workflow files must be pushed before hosted CI can run. A repository administrator must enable the `Required checks` branch rule. Cloud deployment, provider credentials, full accessibility auditing, and the consolidated learning-loop features remain explicit implementation/acceptance work.

## Profile revision checkpoint — 2026-09-28

The `/api/v1/me` profile API now stores an IANA timezone and integer revision. `GET` returns an ETag; `PATCH` requires that ETag in `If-Match` and rejects stale writes with `412` and the current ETag. The migration adds defaults for existing profiles and increments revisions when a verified provider email changes.

Backend Ruff, format, mypy, and unit checks passed (31 unit tests). The Docker integration gate passed with PostgreSQL, Redis, Celery, 40 total tests, 93.97% coverage, and no Alembic drift. The frontend production build, TypeScript check, and 93 demo browser tests passed. These frontend tests do not exercise a connected Supabase session or the new profile endpoint; that remains a B20 acceptance gate.

## Worker database lifecycle checkpoint — 2026-09-28

The API and Celery workers now use separate configurable PostgreSQL pool budgets. A Celery child initializes its engine after fork; a task-local session queries PostgreSQL and is closed afterward. Backend Ruff, formatting, mypy, and 33 unit tests passed. The Docker gate passed all 43 tests, including the real worker/database round trip, at 91.03% coverage; Alembic reported no drift. Frontend contracts did not change in this checkpoint.

## Jobs foundation checkpoint — 2026-09-28

The B07 jobs foundation adds a PostgreSQL job record, explicit state transitions, and authenticated owner-scoped `GET /api/v1/jobs/{id}`. The database test covers isolation, queued/running/unknown/terminal states, safe terminal replay, stale-write rejection, cancellation, timeout, and bounded result summaries. Backend Ruff, formatting, mypy, and 33 unit tests passed. An isolated Docker stack using the pgvector image passed all 44 backend tests at 91.27% coverage, including the jobs database test.

The full integration target's final Alembic drift check remains incomplete while the concurrently developed RAG `content_chunks` migration has no matching model registration. The B07 plan checkbox remains open pending a clean repository-wide migration check. The frontend production build, TypeScript check, and all 93 browser tests passed for the new read API contract; these are still demo-mode tests, not connected API tests.

## Transactional job outbox checkpoint — 2026-09-28

An internal service now commits a job and its dispatch intent together. A Compose dispatcher uses PostgreSQL `FOR UPDATE SKIP LOCKED`, bounded batches, stable Celery task IDs, and retry backoff after a broker error. The real-service integration test simulated a broker outage, verified the intent remained durable, then delivered it through Redis to a worker; it also verified that cancellation before dispatch discards the intent. The affected integration test passed after the dispatcher entry point was factored into a callable single pass. The Compose dispatcher started successfully against the migrated database and broker. Scoped Ruff and format checks, strict mypy, and 33 unit tests passed.

The full Docker suite passed all 45 tests but failed the required 85% coverage threshold at 80.77%. Most of the new uncovered lines are in the concurrently developed RAG ingestion module, which currently has no tests. Repository-wide Ruff also reports errors in that module and its migration. Alembic drift reports only the RAG `content_chunks` table and indexes as unregistered; it reports no job or outbox drift. The B07 outbox checkbox remains open until these shared gates pass. Future business tasks still require idempotency, leases, and recovery before public job submission.

## Worker lease and fencing checkpoint — 2026-09-28

Migration `0008_job_leases` adds an attempt count and timed lease to each job. The internal diagnostic task now claims the job, writes a PostgreSQL result before returning, and ignores repeated delivery. A replacement attempt receives a new token; an expired or cancelled worker cannot commit a stale result. The real-service test covers broker retry, the owner API's completed result, duplicate Celery delivery, lease expiry and replacement, stale completion, and cancellation. Scoped Ruff/format, strict mypy, and all 33 unit tests passed; the focused Docker integration test passed after the final API assertion.

The full Docker run passed all 45 tests but still failed the unchanged 85% coverage gate at 80.52%. Repository-wide Ruff still fails only in the concurrent RAG ingestion and migration files. Alembic drift again reports only the unregistered RAG `content_chunks` table and indexes; it reports no job lease drift. Domain tasks, stuck-job reconciliation, and public submission remain pending B07 work, so its checkboxes remain open.

## Expired job recovery checkpoint — 2026-09-28

The dispatcher now reconciles expired running leases before publishing outbox work. It requeues only tasks in an explicit safe replay list, stops after three local attempts with a `timed_out` status, and places unlisted tasks in `unknown` for manual or provider reconciliation. The integration test simulates a lost worker claim, confirms a real worker completes the replayed job, and rejects the original worker's stale result. It also checks retry exhaustion and the uncertain-task path. Scoped Ruff and format checks, strict mypy, 33 unit tests, and all 46 backend tests in the isolated PostgreSQL/Redis/Celery stack passed. No schema or frontend contract changed in this checkpoint. The separate repository-wide coverage and migration gates remain open as previously recorded.

## Published but unclaimed recovery checkpoint — 2026-09-28

Migration `0009_outbox_publications` records successful publications separately from broker failures and backfills existing published rows. The dispatcher now checks jobs that remain queued past the broker visibility window. It republishes only the safe diagnostic task, stops after three publications with a `start_timeout` result, and moves unlisted work to `unknown` without replay. The real-service test also verifies that a recent publication is left alone. Scoped Ruff/format, strict mypy, 33 unit tests, and all 47 backend tests in the isolated PostgreSQL/Redis/Celery stack passed. Alembic reported no drift for the outbox migration; its remaining repository-wide drift is in the separate content schema. The frontend contract did not change.

## Browser profile revision contract checkpoint — 2026-09-28

The browser can now send `If-Match` on cross-origin profile edits and read the `ETag` returned by `/api/v1/me`. The regression test covers the actual profile route plus its PATCH preflight. Scoped Ruff/format, strict mypy across 41 source files, and all 34 backend unit tests passed. This changes only CORS policy, so the database integration gate is unaffected; connected frontend profile editing remains B20 work.

## Learner curriculum read checkpoint — 2026-09-28

The API now serves the nine exported units and individual unit details with stable IDs, content version, review status, and placeholder flags. Explicit response schemas omit checkpoint answer keys and explanations. A source bug that wrote difficulty levels into lesson types was corrected, and the frontend service contract/demo projection now use the same learner-safe shape. Backend Ruff/format, strict mypy across 45 source files, and 35 unit tests passed. Frontend TypeScript, curriculum export parity, and six focused service tests passed. The standard Playwright command could not start its server while a separate Next development server held `.next`; the six server-free service tests passed using an isolated Playwright config. A production frontend build and connected browser test remain open. No database schema changed.

## Prediction wire contract and metric checkpoint — 2026-09-28

Matching Pydantic and TypeScript shapes now describe prediction submission and a completed pair, including ordered basis labels, measurement-qubit mapping, comparison basis, schema and metric versions. The backend validates finite normalized vectors and calculates unrounded `1 - TVD` agreement. A frontend helper converts current 0–100% prediction and confidence sliders to 0–1 wire values. Tests cover valid and invalid distributions, two-qubit basis ordering, mismatched lengths, NaN/infinity, and fabricated pair scores. Scoped Ruff/format, strict mypy across 48 source files, 39 backend unit tests, TypeScript, and seven focused frontend service tests passed. No API route, persistence, run pairing, or tutor history exists yet.

## Durable prediction intake checkpoint — 2026-09-28

Migration `0010_learning_predictions` adds owner-bound learning sessions and locked prediction records. The prediction foreign key includes learner, lesson ID, and lesson version, preventing a row from attaching to another learner's session. `POST/GET /learning-sessions`, nested prediction create, and `GET /predictions/{id}` require verified identity; writes require a UUID idempotency key and reject changed-body replays. The integration test covers durable storage, replay, content-version mismatch, client-supplied simulated-result rejection, cross-user reads/writes, and the composite foreign key. The export now has a separate `content_version` from its format `schema_version`. Scoped Ruff/format, strict mypy, 39 unit tests, and all 54 backend tests in the isolated Docker stack passed. The migration upgraded from a fresh database and passed a downgrade-to-0009/re-upgrade check. Alembic's only reported drift remains the separately developed `content_chunks` search table. Trusted run pairing and connected frontend use remain open.

## Circuit persistence checkpoint — 2026-09-28

Migration `0011_circuits` adds owner-scoped circuits and revision snapshots. The API creates a circuit with a UUID idempotency key, reads the current or a historical revision, and updates under `If-Match`; it rejects changed-body replays, stale writes, invalid gate structure, and cross-user access. A focused real-database integration test passed, as did scoped Ruff/format, strict mypy across 59 source files, 54 local unit tests, and all 70 backend tests in the isolated PostgreSQL/Redis/Celery stack. The migration upgraded from a fresh database and passed a downgrade-to-0010/re-upgrade check. Alembic still reports only the separately developed `content_chunks` table and indexes, with no circuit drift. Circuit list/archive, sharing, import/export, connected frontend use, and executable gate semantics remain open B06/B08 work.

## Local Aer run pipeline checkpoint — 2026-09-28

Qiskit Aer 0.17.2 is pinned in the `quantum` dependency group and installed only in the Celery worker/test image. Authenticated `POST /api/v1/experiments/runs` requires an idempotency key and an owned circuit revision; it atomically stores an immutable run snapshot and job/outbox intent, returns `202`, and exposes owner-scoped `GET /api/v1/experiments/runs/{id}`. The worker runs ideal circuits with bounded shots and memory, derives exact probabilities and seeded counts, and stores results under a fenced lease. Duplicate delivery cannot overwrite a completed result. Mid-circuit gates after measurement return an explicit unsupported-circuit error. Analytical tests cover gate translations, Bell-state bit ordering, subset measurements, seed/shot bounds, and simulator failures.

The real PostgreSQL/Redis/Celery API-to-worker test passed. Backend Ruff/format, strict mypy across 72 source files, dependency lock check, and 77 local unit tests passed. The complete isolated Docker suite passed 94 tests at 85.15% coverage. Migration `0012_experiment_runs` passed downgrade-to-0011/re-upgrade. Alembic still reports only the separate RAG `content_chunks` table/indexes, with no experiment-run drift. Prediction pairing, noise, frontend connection, and additional providers remain open.

## Collaborative parties and Studio inspection — 2026-10-04

Verified the uncommitted working tree based on `ddf18d9`. B16 now includes durable 2–6 member parties, scoped invitations and roles, chat, atomic edit revisions, duplicate-event handling, rejected-edit recovery, reconnect replay, transient presence, revocation, and Redis notification delivery across API instances. A frozen party revision produces an immutable owned circuit for the real Aer worker and saved-circuit tutor context. The next completed slice is Studio state inspection and keyboard circuit editing under B06/B20; the broader accessibility workstream remains open. Protocol and usage are in [collaboration.md](collaboration.md).

- `UV_CACHE_DIR=/private/tmp/quantumloop-uv-cache make backend-check backend-test`: Ruff, formatting, strict mypy across 96 source files, and 90 unit tests passed.
- `POSTGRES_PORT=5490 BROKER_PORT=6390 API_PORT=8090 make test-integration`: 113 tests passed with real PostgreSQL, Redis, Celery, and Aer; coverage was 87.00% against the 85% gate. Alembic reported no drift. The suite creates a fresh disposable database, upgrades to head, downgrades to 0016, and upgrades again.
- `make frontend-check`: production build, TypeScript, curriculum parity, and all 105 browser tests passed. After the final UI labels and retry/account cleanup, `pnpm build` and `PLAYWRIGHT_PRODUCTION=1 pnpm exec playwright test tests/studio-inspection.spec.ts` passed again (2 tests). Inspection checks cover analytical intermediate/final state differences, keyboard editing, first/last boundaries, zero values, stale snapshots, and focus recovery.
- `pnpm test:parties`: the connected browser scenario passed with two isolated accounts routed to two API instances for both HTTP and WebSocket traffic. It exercises creation/join, persisted chat, convergent edits/reload, immutable party execution through the real worker, saved tutor context, and member removal. The final retry/account-cleanup changes were included in this rerun.
- Database tests cover concurrent capacity enforcement for a six-seat room, role restrictions, invitation expiry/revocation, duplicate/conflicting edits, settings conflicts, replay gaps, Redis failure/retry, and frozen-copy retries after private circuit edits. Real Socket.IO tests cover reconnect, multiple API instances, token expiry, revoked membership, and rejection of polling transport.
- CI workflow syntax passed `actionlint`; `git diff --check` passed.

The connected browser fixture uses locally signed JWTs with a stub JWKS boundary and a deterministic tutor provider. It verifies actual API token validation and database/worker behavior, but does not establish live Supabase or live tutor-provider acceptance. Cloud deployment and actual screen-reader/WCAG assessment were not run. The missing content model was registered to match the existing 0006 schema, resolving the previously recorded content migration drift without changing that schema.

## Hardware collaboration extension — 2026-10-04

Hardware Studio now generates authenticated invitations that open the actual shared hardware design. Migration `0019_hardware_parties` adds a constrained document kind and defaults existing rooms to circuit mode. The same party roles, invitation policies, chat, revision locking, durable replay, presence, and Redis delivery apply to both editors. Hardware stages/components/routes merge by ID in atomic batches, with validated catalog ports and deletion cascades. Metadata conflicts and invalid wiring are rejected without advancing revision. Circuit create/action idempotency hashes remain compatible with existing rooms.

The connected hardware scenario uses two editor accounts and a third view-only account, with the second editor's HTTP and WebSocket traffic routed to a separate API process. It verifies preexisting component sharing, placement, route creation, offline/reload recovery, persisted chat, rejected view-only edits, owner closure, denied access after closure, and personal draft restoration. The first browser run exposed a personal draft loss on full-page navigation; the fix preserves the original draft in localStorage throughout the party and restores it explicitly before leaving. Both circuit and hardware connected scenarios passed after that fix.

- Backend lint/format, strict mypy across 97 source files, and 92 unit tests passed.
- `POSTGRES_PORT=5490 BROKER_PORT=6390 API_PORT=8090 make test-integration` passed all 116 tests at 87.33% coverage, including concurrent independent hardware edits, movement, stale metadata, invalid/missing/reused ports, duplicate-event replay, role restrictions, revocation, deletion cascades, and rejection of quantum execution for hardware rooms. Fresh database and migration round-trip tests passed; Alembic reported no drift.
- `make frontend-check` passed the production build, TypeScript, hardware catalog parity, and all 107 browser tests. New checks verify bounded hardware snapshot decoding and opening a demo snapshot in a separate browser with no fake party ID.

General owned hardware CRUD/export and server scientific/thermal diagnostics remain B19 work. Shared hardware rooms persist in PostgreSQL; explicit hardware Save remains a browser-local personal copy. Live Supabase/provider, deployment, and full assistive-technology acceptance remain unverified as described above.

## Private Circuit Studio workspace — 2026-10-04

The next completed B06/B20 slice connects the owned circuit library to Studio: explicit cloud save, cross-browser reopening, stale-write recovery without discarding drafts, archive/restore, historical copies, selected browser-draft import, saved-revision Aer execution, and durable tutor/run recovery. Private records are excluded from anonymous browser persistence. Behavior and limitations are documented in [private-circuits.md](private-circuits.md).

- `UV_CACHE_DIR=/private/tmp/quantumloop-uv-cache make backend-check backend-test`: Ruff and format checks, strict mypy across 97 files, and 92 unit tests passed.
- `POSTGRES_PORT=5490 BROKER_PORT=6390 API_PORT=8090 make test-integration`: 116 tests passed, 87.44% coverage against the unchanged 85% gate, and no Alembic drift. Migration `0020_circuit_archive` is included. Database acceptance covers archive/restore preconditions, archived edit rejection, immutable historical snapshots, pagination, and ownership isolation.
- `make frontend-check`: production build, TypeScript, hardware catalog consistency, and all 107 production browser tests passed.
- `pnpm test:parties`: all three connected browser journeys passed across isolated sessions and two API instances: circuit party collaboration, hardware party collaboration, and the private circuit workspace. The private journey verifies stale-edit preservation, a committed update with a lost response, cross-account denial, archive/restore, real Aer execution, saved tutor history, reload recovery, and exclusion from anonymous persistence.
- The first full backend run exposed a test reconnect race: Socket.IO membership had disconnected before Engine.IO transport teardown completed. The test now waits for both observable states before testing expired-token rejection; no production authorization behavior or assertion was weakened.
- Browser acceptance found and fixed canonical circuit comparison depending on JSON field order, and tutor reload filtering using fields absent from the public response. Tutor history now filters the actual source record IDs.

Connected acceptance uses locally signed JWTs with real API validation, PostgreSQL, Redis, Celery and Aer, plus a deterministic tutor provider. Live Supabase sign-in/refresh/password recovery, live tutor-provider behavior, production deployment, backup/rollback recovery, and full screen-reader acceptance remain release gates. General private hardware design CRUD remains open; durable hardware collaboration is already verified separately.
