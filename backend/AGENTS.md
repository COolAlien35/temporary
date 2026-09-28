# Backend implementation rules

Read `../backend_plan.md`, `../docs/backend-review.md`, and `../docs/development.md` before implementing a major task.

- Build a modular monolith. Create a feature module only when implementing its behavior; avoid speculative empty packages.
- Each feature owns its router, schemas, services, repositories, models, and migrations. Routers call services; services own transactions; repositories never commit independently.
- Cross-module access goes through `public.py` or schemas. Do not import another module's repositories/models or rely on its private table layout in application code. Reporting queries may use documented read models.
- Shared `core` contains infrastructure/policy primitives, not feature logic. Provider SDKs belong in `integrations`; expensive computation belongs in worker adapters, never API handlers.
- Synchronous database calls belong in sync routes or bounded thread offloads. Never share a SQLAlchemy session across requests, tasks, async jobs, or forked worker processes. Initialize worker engines after fork.
- Add model imports to Alembic metadata registration and a migration with every persisted change. Never run `create_all()` at application startup.
- Treat queue delivery as at-least-once. Domain writes need idempotency, authorization, version checks, and explicit retry/cancellation semantics. Do not enable late acknowledgements for side-effecting tasks before their recovery behavior is tested.
- Do not infer identity, grades, instructor authority, or earned rewards from frontend fields.
- After EVERY major task, implement and run the task's test gate from the plan. Debug failures, add regression coverage for real bugs, and rerun affected suites before proceeding or checking off the task.
- Run lint, formatting, types, and unit tests for backend changes. Run real-service integration tests for schema/queue/Docker changes, and frontend production/browser checks for contract changes.
- Never hide failures with skips, automatic retries, blanket type ignores, weaker assertions, or a lower coverage threshold. Record unavailable external checks accurately.
