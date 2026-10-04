# Deploy QuantumLoop on Render

The chosen stack is Render (web/API/workers and two Key Value instances) plus Supabase (Auth and PostgreSQL). AWS is an optional later migration in `backend_plan.md`. This is a **preview deployment**: the connected login, curriculum, prediction, saved circuit, local Aer run, and tutor paths have backend support, while assignments, grading, community, rankings, and several other screens still use browser-local demo data. Do not advertise those screens as shared or graded production features.

`render.yaml` provisions two paid Key Value instances and four paid services. Review the current charges and choose a Render region close to the Supabase project before creating them. The file uses Singapore. Automatic deploys after initial creation are off so schema upgrades and worker changes can be released in order. Render can start all services during the initial Blueprint creation; check the API migration first and restart the dispatcher if its initial start failed before tables existed.

## 1. Prepare Supabase

1. Create a Supabase project. Enable email authentication and use **asymmetric JWT signing keys**. Record the project URL, publishable key, and auth issuer (`https://<project-ref>.supabase.co/auth/v1`). Configure the public web URL and allowed redirect URLs in Supabase Auth after the Render hostname or custom domain is known.
2. In Database → Connect, copy the **session pooler** URI if Render cannot reach the direct IPv6 endpoint. Use port `5432`, not the transaction pooler on `6543`. Convert only its scheme from `postgresql://` to `postgresql+psycopg://`; add `?sslmode=require` (or `&sslmode=require` if it already has a query string). URL-encode reserved characters in the password. Use the same URI for API, worker, and dispatcher. Keep the total pool size within the Supabase connection allowance.
3. Confirm the `vector` extension is available. Migration `0006` creates it. Do not seed sample learner achievements into this project.

## 2. Set up the Render Blueprint

1. Push this repository to GitHub. In Render → Blueprints → New Blueprint Instance, connect the repo and select `render.yaml`.
2. Review the paid services and enter prompted values. Set `QL_DATABASE_URL` and `QL_AUTH_ISSUER` on the API; the worker and dispatcher inherit them through Blueprint service references. On the API, set `QL_CORS_ORIGINS` to a JSON array containing the exact HTTPS web origin, for example `["https://quantumloop-web.onrender.com"]`. Add `QL_TUTOR_API_KEY` and `EMBEDDING_API_KEY` to the API in the Render dashboard only if enabling those provider-backed features; absent keys leave them unavailable. Never put server keys in `NEXT_PUBLIC_*` variables.
3. On the web service, enter `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the final public API origin in `NEXT_PUBLIC_QUANTUMLOOP_API_URL` (for example `https://quantumloop-api.onrender.com`). These values are compiled into the browser bundle. Update the matching Supabase redirect and API CORS origins if Render assigns different hostnames.
4. Verify the broker is the paid persistent `noeviction` instance and the cache is separate. The Blueprint uses private Render connection URLs; do not expose Key Value publicly.

Render builds the backend API from the `runtime` stage and the quantum worker from the `worker` stage. The worker needs its larger image for Qiskit Aer. The API's pre-deploy command runs `alembic upgrade head` once per API release. Check its logs before starting the dispatcher or submitting jobs.

The worker and dispatcher reference the API's database, auth issuer and HTTPS CORS settings because production startup validation applies to every backend process. Their database pools are bounded; the default Blueprint budgets 3 API connections, 4 across the two worker children, and 2 for the dispatcher, plus migration/operator headroom. All processes still need the same database and issuer values. The web build requires all public connected settings and rejects secret/service-role keys. Render supplies environment values as Docker build arguments; only public browser settings and the image stage are consumed by these Dockerfiles. See [Render Docker configuration](https://render.com/docs/docker) and [Blueprint references](https://render.com/docs/blueprint-spec).

## Repository release gate

Run `make release-check` with the local database, Redis, and worker available. Use `POSTGRES_PORT`, `BROKER_PORT`, and `API_PORT` if the default ports are occupied. The Makefile passes selected local ports into the connected fixtures; explicit `QL_DATABASE_URL`, `QL_BROKER_URL` and `QL_CACHE_URL` override those defaults. The gate validates Render service wiring and production startup settings, frontend release variables, Compose, backend checks/integration, the production frontend, and all connected collaboration/private workspace journeys.

The release gate also runs `make recovery-drill` after its browser checks; it can be run separately after the integration gate. This local drill creates two uniquely named disposable databases, migrates a source, backs it up with `pg_dump`, restores it with `pg_restore`, compares owned archived circuit snapshots/checksums and the migration head, and checks schema drift. It removes only its own databases. It also stops the local worker, queues a diagnostic task while it is offline, restarts it, and waits for completion. Do not run the drill alongside other worker tests. This proves local mechanics; a Supabase backup restore remains a separate staging check.

CI checks high/critical production npm advisories. Before release, audit the API and worker lock with `uv export --frozen --no-dev --group quantum --no-hashes --format requirements-txt` and `pip-audit` against the exported requirements. Never pass credentials to an audit command. Review advisories again at deployment time; the local result is dated evidence.

For the optional GHCR publication workflow, configure the three `NEXT_PUBLIC_*` repository variables first. It publishes separate API, quantum-worker and frontend images, and the frontend build fails if its connected configuration is missing. Render can build directly from the same checked source and lockfiles instead.

## Controls and operating checks

The API limits request bodies to 256 KiB before JSON parsing, including chunked bodies (`QL_REQUEST_BODY_MAX_BYTES`). Each account can submit 100 new Aer runs per UTC day (`QL_SIMULATION_DAILY_RUN_LIMIT`); replaying an accepted idempotency key remains available after the quota is reached. Tutor requests have their separate daily cap. API responses use `Cache-Control: no-store`; web/API responses include defensive content/referrer headers. Root and frontend Docker contexts exclude environment files and local credentials.

Use the returned `X-Request-ID` to correlate API status and timing logs. Do not log bearer tokens, prompts, passwords, invitation secrets, or connection strings. Configure uptime alerts on API readiness and the web origin, and watch queue age, worker failures, Redis broker memory (no eviction), and database connection use before opening public traffic. External monitoring/alerts require the provisioned deployment.

Before promotion, run the deployed sign-in, refresh, sign-out, save/run/tutor and two-account isolation checks; test circuit and hardware invitations across browsers and reconnect after an API restart. Verify TLS, exact CORS origins and Supabase redirect allowlists. Recovery emails/password-reset screens currently remain a labeled demo flow; enable a credentialed managed-auth recovery journey before claiming complete account recovery.

## 3. First release and checks

1. Wait for the API's successful pre-deploy migration and `/api/v1/health/ready` response. This probe checks PostgreSQL and both Key Value connections. If it fails, inspect the API logs and the exact database/Redis environment values.
2. Check the quantum worker and dispatcher logs. If the dispatcher started before migrations and exited, deploy/restart it after the API is ready. The dispatcher should have **one instance**; it owns outbox publication and recovery.
3. Check the web service. If any `NEXT_PUBLIC_*` value was corrected after the first build, redeploy the web service to rebuild the client bundle.
4. Open the web URL in a private browser, create a real Supabase account, sign in, and check `/api/v1/me` with that user's bearer token. Save a circuit, reopen it, submit a prediction, run local Aer, and verify the saved run/result after a reload. Test with a second account to confirm private records do not cross accounts. If tutor is enabled, verify a real response and provider-failure handling.
5. Run the repo gates before promoting the same revision: `make backend-check backend-test`, `make frontend-check`, and `make test-integration` with the local Docker dependencies. The deployed smoke above is still required; local tests do not prove Supabase/Render behavior.

For a custom domain, attach it to the Render web/API services, then update Supabase Auth redirect URLs, `QL_CORS_ORIGINS`, and `NEXT_PUBLIC_QUANTUMLOOP_API_URL`. Redeploy the web service after the browser API URL changes. Render manages HTTPS for connected domains.

## Subsequent releases and recovery

1. Back up Supabase PostgreSQL and verify restore capability before schema changes. Keep the previous app release available.
2. Run the CI checks. Deploy the API first; its pre-deploy migration must succeed. Use additive, backward-compatible migrations while old API/worker instances can still be running. Then deploy worker, dispatcher, and web for the same commit. Avoid concurrent manual API releases because they could run migrations simultaneously.
3. Watch API readiness, worker/dispatcher logs, queue backlog, and a real Aer job. Allow the worker up to 300 seconds to drain during replacement. If a release fails after a schema change, roll the app images/code back only if the old code is compatible with that schema; otherwise apply a forward repair. Do not blindly downgrade the database.
4. The PostgreSQL job/outbox records are durable. Redis cache contents are disposable; the broker is persistent but still needs a tested redelivery/reconciliation drill before claiming interruption recovery is verified. Restore PostgreSQL from the Supabase backup procedure if necessary, then reconcile jobs only after assessing whether any remote side effect may already have happened.

## Known release limits

- B09–B12, parts of B14–B15/B17–B19, learner stage-progress resume, and full account recovery are still open; several public pages explicitly say they are demos. Circuit and hardware parties and the private circuit workspace are connected. This deployment does not make remaining demo screens authoritative multi-user services.
- Object uploads, remote quantum adapters, isolated code grading, complete instructor workflows, full accessibility audit, live-provider auth testing, backup restore rehearsal, and production load/incident checks remain open in B21–B23.
- The first deployment requires account-specific Supabase/Render credentials and actual smoke tests. The Blueprint and local checks alone cannot certify a production launch.
