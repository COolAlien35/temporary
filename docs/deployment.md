# Learner MVP deployment on Render and Supabase

`render.yaml` defines the deployable slice: frontend, API, Aer worker, job dispatcher, and separate broker/cache Key Value instances. Supabase supplies Auth and PostgreSQL. This configuration has not yet been applied to a live account. It does not enable the planned grading, storage, collaboration, or RAG features.

## Before creating the Blueprint

1. Choose a Render region near the Supabase database. The Blueprint currently uses `singapore`; change every `region` together before creating the services. The listed plans are paid resources, so review the account's current plan limits and cost.
2. In Supabase, configure an asymmetric JWT signing key and enable the `vector` PostgreSQL extension required by the existing migrations. Obtain the **server-side database connection string**. Convert its scheme to `postgresql+psycopg://` and append `sslmode=require` (preserving any existing query parameters). For an IPv4-only Render connection, use Supabase's session pooler and verify its connection budget. Use a direct connection for migrations when the network supports it; the Blueprint uses the API database URL for its pre-deploy migration.
3. Create an OpenAI API key if the connected tutor is in the release scope. The API will start without it, but connected Explain returns a provider-unavailable response.
4. Review the approved content and account access required for the demo. The connected release slice is the Superposition learner flow; the other frontend experiences remain labeled demo.

## Create and configure

Create a Render Blueprint from this repository's `main` branch and `render.yaml`. It prompts for these values:

| Variable | Where | Value |
| --- | --- | --- |
| `QL_DATABASE_URL` | API | Supabase server-side `postgresql+psycopg://` URL with TLS. Never expose it in the frontend. |
| `QL_AUTH_ISSUER` | API | `https://<project>.supabase.co/auth/v1` |
| `QL_CORS_ORIGINS` | API | JSON array containing the actual frontend HTTPS origin, for example `["https://quantumloop-frontend.onrender.com"]`. No trailing slash. |
| `QL_TUTOR_API_KEY` | API | OpenAI API key for the connected Explain stage. |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase publishable key, never a service-role key. |

The worker and dispatcher inherit API database/auth/CORS settings through Blueprint service references. The frontend gets the API's Render public URL through a service reference. Both Redis URLs are internal Key Value connections; the broker has persistence and no eviction, while the cache and Celery result backend share the disposable cache instance. Saved business results live in PostgreSQL.

The Blueprint sets `REQUIRE_CONNECTED_CONFIG=1` on the frontend. Its Docker build fails if the Supabase URL, publishable key, or API URL is missing, or if either URL lacks HTTPS. Local/demo builds leave this gate off. The root Docker build context excludes local `.env` files.

After the Blueprint assigns the real frontend URL, set `QL_CORS_ORIGINS` to that exact origin if the example differs. Add both `https://<frontend-host>/login` and `https://<frontend-host>/reset-password?connected=1` to Supabase Auth redirect URLs, and set the Supabase site URL to the frontend origin. Public `NEXT_PUBLIC_*` values are baked into the frontend build, so rebuild/redeploy the frontend whenever they change. `sync: false` Blueprint secrets are prompted on initial creation; later changes belong in the Render service environment.

All service auto deploys are off. Wait for the first Blueprint sync and ensure the API pre-deploy `alembic upgrade head` succeeds before accepting traffic. Then verify API readiness, deploy/verify the worker and dispatcher, and deploy/verify the frontend. On later releases, promote a CI-verified commit to `main`; deploy API first so its pre-deploy migration runs once, then worker, dispatcher, and frontend. Do not run concurrent migrations from multiple services. Review every migration for backward compatibility with the previous API/worker image before deployment.

## Smoke and operations

1. Check `https://<api-host>/api/v1/health/live` and `/api/v1/health/ready`; readiness must report database, broker, and cache healthy. Check the frontend `/` and `/signup` routes.
2. Create two separate Supabase learner accounts. Verify signup confirmation if enabled, login, refresh, password recovery, logout, and that `/api/v1/me` returns each account's own profile.
3. With account A, open connected Superposition, lock a prediction, save/revise a circuit, submit an Aer run, wait for completion, view the run and pair in Observe, and request tutor context in Explain. Reload a direct `?stage=5&run=<UUID>` link. Confirm account B cannot read or mutate A's session, circuit, run, or pair.
4. Check API/worker/dispatcher logs and queue backlog. Run the documented instructor provisioning command only after the intended instructor has signed in; then verify cohort access with separate instructor and learner accounts if that path is part of the demo.
5. Record the tested commit, API and frontend URLs, account-specific resource limits, smoke results, and any open findings in the release log. Keep database backup/restore and rollback unclaimed until exercised on staging.

The connected browser suite now runs automated WCAG 2.1 A/AA checks at Learn, Build, Observe, and Explain and checks keyboard focus on stage changes. Before release, complete and record a keyboard-only pass and actual screen-reader passes against the hosted build; the automated checks do not establish full WCAG conformance.

For a repeatable API check, set `QL_SMOKE_API_URL` to the deployed API HTTPS origin, without `/api/v1`. Set `QL_SMOKE_SUPABASE_URL` and `QL_SMOKE_SUPABASE_PUBLISHABLE_KEY` to the project's public values. Use two **separate confirmed test learners** through `QL_SMOKE_EMAIL_A`, `QL_SMOKE_PASSWORD_A`, `QL_SMOKE_EMAIL_B`, and `QL_SMOKE_PASSWORD_B` (the same variables used by the browser smoke). Run from the repository root:

```sh
python3 backend/scripts/deployment_smoke.py --supabase-login --tutor
```

The command signs in both learners through Supabase Auth and checks health, real bearer identities, the supported lesson, saved circuit/prediction, Aer completion, server-derived pair, run-grounded tutor response, and owner isolation at every persisted resource. It prints only pass/fail steps, never passwords, tokens, or provider response bodies. For an existing token-based workflow, omit `--supabase-login` and supply fresh `QL_SMOKE_TOKEN_A` and `QL_SMOKE_TOKEN_B` instead. It creates a circuit, lesson session, prediction, run, and tutor message for account A and uses one run and one tutor request from that account's daily quotas; use disposable test accounts. `--tutor` calls the paid provider and should be included in release acceptance. Without it, the command checks the Aer slice only. A `401` is a failed smoke, not a reason to bypass auth. This API command supplements the browser signup/recovery, keyboard, and actual screen-reader checks above.

For the real browser path, use two confirmed Supabase email/password **test accounts** and set `QL_SMOKE_FRONTEND_URL` to the deployed frontend HTTPS origin. Set `QL_SMOKE_EMAIL_A`, `QL_SMOKE_PASSWORD_A`, `QL_SMOKE_EMAIL_B`, and `QL_SMOKE_PASSWORD_B` in the shell environment, then run:

```sh
cd frontend
pnpm test:deployment
```

The browser check signs in through the real Supabase UI, saves a prediction and circuit, waits for the Aer comparison, reloads its direct run link, requests a tutor explanation, and reloads that saved discussion. It then opens a separate browser context for the other learner, confirms the run is unavailable there, and verifies the first learner can still reopen it. It uses no network mocks. Playwright traces, screenshots, and video are disabled for this credentialed run. Do not put these test passwords in committed files or CI logs. The check creates one run and one tutor message. Its separate configuration is excluded from ordinary CI until a secure hosted test environment and secrets are provisioned.

After deploying a CI-verified commit, the same API and browser checks can run together through the manual **Hosted learner smoke** GitHub Actions workflow. Add `QL_SMOKE_EMAIL_A`, `QL_SMOKE_PASSWORD_A`, `QL_SMOKE_EMAIL_B`, and `QL_SMOKE_PASSWORD_B` as repository Actions secrets for two confirmed disposable Supabase learners. In **Actions → Hosted learner smoke → Run workflow**, select the default branch and enter the deployed API/frontend HTTPS origins, Supabase project URL, and public publishable key. The workflow rejects missing or identical accounts and runs the real API/Aer/tutor check before the browser journey. It does not provision services, test signup email delivery or recovery, or replace the staging restore and accessibility gates. Keep these accounts restricted to the test deployment; the workflow creates two runs and two tutor requests for account A across its API and browser stages.

The API has a per-account daily Aer submission cap (`QL_SIMULATION_DAILY_RUN_LIMIT`, default 100). The Render worker uses a 240-second soft limit and 270-second hard limit, leaving 30 seconds within its maximum 300-second shutdown window for task cleanup. The initial plan runs one API instance, one worker at Celery concurrency 2, and one dispatcher. Monitor CPU, memory, queue age, Redis usage, and Supabase connection count before scaling. Keep a previous known-good image/commit available. If a release fails after a compatible migration, redeploy that commit and let queued jobs reconcile; for an incompatible migration, follow a separately rehearsed database recovery procedure. Do not reverse production migrations blindly.

CI rehearses a `pg_dump`/`pg_restore` into a separate disposable database after its integration tests. It verifies that a saved profile and Alembic version survive restoration, then removes the temporary database and dump. To run the same check on a local Compose stack, use `QL_RESTORE_REHEARSAL=1 sh backend/scripts/rehearse_restore.sh` from the repository root. This does not verify Supabase backups, restore time, credentials, point-in-time recovery, or the behavior of in-flight jobs; rehearse those in staging before release.

CI also stops its Compose worker, publishes a diagnostic task to the real broker while no worker is running, restarts the worker, and verifies delivery through the real result backend. Run it locally with `QL_WORKER_RESTART_REHEARSAL=1 sh backend/scripts/rehearse_worker_restart.sh` after starting the Compose stack. This proves recovery of queued work during worker downtime, not graceful draining of an in-flight Aer run or Redis restoration; exercise those with the staging deployment before release.

## Remaining release gates

This configuration is preparation, not proof of a hosted release. B23 still requires live provisioning, credentialed two-account tests, controlled rollout/rollback and backup restoration, worker drain/replay checks, accessibility review, and provider-specific smoke evidence. See [the plan](../backend_plan.md) and [local development](development.md).
