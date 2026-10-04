# Deployment readiness — 2026-10-04

The repository is prepared for the **scoped preview deployment** described in [deploy-render.md](deploy-render.md). Render and Supabase have not been provisioned. This record separates verified repository behavior from the checks that need that environment.

## Verified locally

| Gate | Evidence |
| --- | --- |
| Production settings and Blueprint | API, worker and dispatcher settings validate; worker services inherit the API's database, issuer and HTTPS CORS settings; persistent private broker and separate disposable cache are declared |
| Backend static/unit | Ruff, formatting and strict mypy across 98 source files; 95 unit tests passed |
| Real backend services | 119 tests passed with PostgreSQL, Redis, Celery and Aer; 87.55% coverage exceeds the 85% gate; no Alembic schema drift |
| Frontend release | Next.js 16.3.6 production build, TypeScript, catalog consistency and 107 production browser tests passed |
| Connected journeys | Circuit parties, hardware parties and private circuit save/conflict/archive/Aer/tutor recovery passed across accounts and two API instances |
| Dependency security | All 197 production npm dependencies returned zero advisories; the locked API and quantum worker Python requirements returned no known vulnerabilities |
| Image startup | Connected frontend Docker build with safe example public settings succeeded; its nonroot production server returned HTTP success and the expected security headers |
| Backup restore | Disposable PostgreSQL databases proved `pg_dump`/`pg_restore`, preservation of owner/archive/snapshot/checksum, migration head and no drift |
| Worker interruption | A real broker task queued with the local worker stopped completed after restart |
| Workflow syntax | Pinned Actionlint validated CI and publication workflows |

`make release-check` runs the configuration, backend, integration, production frontend, connected browser and recovery gates sequentially. It respects local `POSTGRES_PORT`, `BROKER_PORT`, `CACHE_PORT` and `API_PORT`. Do not run the worker recovery drill concurrently with other worker tests. CI also checks dependency advisories and recovery. The image publication workflow builds separate API, quantum worker and frontend images; configure the three public frontend repository variables before publishing a connected image.

## Implemented release controls

- Docker contexts exclude local environment files and credentials. Hosted connected builds require configured HTTPS origins and reject Supabase secret/service-role keys.
- API bodies are bounded before JSON parsing, including chunked requests. API data is marked `no-store`; web/API responses include defensive content/referrer headers.
- New Aer runs have an account quota enforced under a database lock. Accepted idempotency replays still work after the limit is reached. Tutor has its independent quota.
- API logs correlate request ID, method, status and duration without logging request bodies, tokens, queries or connection strings.
- Paid private broker persistence, separate cache, bounded database pools, migration-before-traffic, manual release ordering and worker drain settings are recorded in the Blueprint/runbook.

## Perform after provisioning

1. Configure Supabase asymmetric Auth keys, the database session pooler with TLS, and the public web/API origins; enter server credentials only in the hosting environment. Configure Auth redirect allowlists and required email delivery settings.
2. Validate/sync the Blueprint in the chosen Render account. Check successful migrations, API readiness, worker/dispatcher logs and the rebuilt browser configuration.
3. Verify real sign-in, refresh, sign-out, private save/reopen, exact-revision Aer execution, tutor behavior if enabled, and access denial between two accounts. Test both circuit and hardware invitations and reconnection on the deployed proxy.
4. Set GitHub branch protection to require `Required checks` on the current commit. Configure readiness/queue/worker/broker-memory/database alerts, provider budgets and operational ownership.
5. Rehearse Supabase backup restore and application rollback against the migrated schema in staging. The local restore drill does not validate the managed backup service. Repeat dependency/image security review at promotion time.

## Supported scope

Connected identity, curriculum/learning-loop APIs, saved circuits/Aer/tutor, circuit parties and hardware parties are implemented. Private hardware CRUD/export/diagnostics, full lesson-stage resume, complete managed password recovery, instructor grading/workflows and other remaining plan features are not certified by this release. Browser-only screens stay labeled as demos; they do not become trusted production records. Full load/monitoring, retention/account deletion and assistive-technology acceptance remain release work for a general production launch.
