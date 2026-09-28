# Infrastructure verification — 2026-09-28

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
