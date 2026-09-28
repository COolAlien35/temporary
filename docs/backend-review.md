# Backend plan review

The original plan covered the product surface well, but several instructions were too broad to implement safely. This review records concrete corrections. It is not a claim that unimplemented features have been tested.

| Finding | Consequence | Correction |
| --- | --- | --- |
| B03 required the entire product schema before auth | Long initial migration, speculative coupling, slow usable delivery | Establish conventions/identity first; add each domain's migration with its feature |
| Quiz grading depended on all simulation work; discussions depended on contests | Unnecessary serial work | Split quiz/circuit prerequisites and make contest association optional |
| “Prevent duplicate provider charges” implied exactly-once execution | A timeout after remote acceptance can lead to double submission | Provider idempotency key or lookup when supported; otherwise an unknown state and reconciliation, without blind retry |
| Redis prefixes were described as enough isolation | Cache memory pressure can evict broker data on the same Redis server | Separate broker/cache servers; non-evicting broker with memory monitoring |
| Async semantics lacked worker-specific limits | Long jobs can be redelivered during execution or monopolize workers | Visibility timeout above hard task duration, low prefetch, bounded queues and per-task recovery policy |
| Cancellation relied on job status alone | An old worker can overwrite a cancelled/newer result | Transactional terminal transitions, leases/fencing, immutable run revisions |
| Broadcast-after-commit was treated as sufficient | Process can die between commit and broadcast | Outbox delivery plus revision replay/snapshot; notifications are hints, database state is authoritative |
| Socket.IO Redis adapter appeared sufficient for horizontal scaling | Long-polling requests may hit a server without their session | WebSocket-only transport or documented sticky routing; test two instances |
| A single environment would eventually contain every quantum SDK | Dependency conflicts, larger API images, CPU/memory contention | Keep API lean; introduce separately locked worker images/queues when adapters need them |
| Existing simulator contract requires statevector/step snapshots | Remote hardware cannot provide these results; arrays can grow exponentially | Explicit capabilities and optional quantities, size limits, artifact offload |
| Numerical comparisons were underspecified | Equivalent states fail due to global phase; shot noise produces flaky grades | Phase-aware vector checks, statistical distribution tests, explicit noise/measurement semantics |
| Frontend imports answer keys and trusts actor IDs | Hiding fields in API responses alone does not secure connected grading | Server-owned rubrics, remove protected question keys from connected bundles, distinct demo content, server-derived actors |
| Service-layer abstraction was only a directory sketch | Cross-feature imports and transaction coupling grow unchecked | Module ownership rules plus architecture tests, explicit public interfaces and service transactions |
| SQL/async and database pool behavior were unspecified | Blocking the event loop and exhausting managed PostgreSQL connections | Sync DB routes initially; bounded async offload and process-wide connection budgets |
| Tests were mostly a final release phase | Faults accumulate before discovery | Task-specific gate after every major task, production frontend tests, real-service backend integration, required CI check |
| Provider alternatives were still open | A production deploy cannot be honestly automated end to end | Automate portable build/test/image publication now; keep provider deployment and credentialed smoke gates open |

## What the initial setup proves

The scaffold contains FastAPI health/error/configuration handling, SQLAlchemy sessions, Alembic migration tracking, Celery queues, and a diagnostic task. Compose starts PostgreSQL, separate broker/cache Redis instances, one migration process, API, worker, and an optional frontend. Test containers exercise actual infrastructure. No learner/auth/grading/tutor endpoint has been fabricated to suggest feature completion.

The baseline migration intentionally creates no domain tables. B04 owns the first user/cohort models. Integration tests compare the database to Alembic's configured head so later migrations extend the existing gate.

## Remaining design decisions

- Select managed auth, storage, sandbox, and hosting providers before implementing their integrations. The local Compose passwords and exposed localhost ports are development defaults, not production configuration.
- Decide qBraid execution/device capabilities and whether code challenges require a custom quantum runtime before committing to their acceptance criteria.
- Specify actual numerical latency/load/cost budgets in B01. Horizontal process separation provides a scaling path; capacity is established through measurements, not directory structure.
- The local setup does not provision an unused object store, sandbox, model endpoint, or Socket.IO server. Add each with its feature, health checks, and meaningful tests. The CI test collector will pick up newly added suites automatically.
- Provider outages, distributed systems races, scientific correctness, and sandbox isolation need targeted testing. Passing scaffold tests cannot certify those future behaviors.

## Sources checked during review

- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/): health and successful migration dependencies.
- [Celery Redis transport](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html): visibility timeout and redelivery limitations.
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use): immutable action pins and least-privilege workflow tokens.
- [Socket.IO multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/): transport affinity and cross-server adapters; verify Python server/client configuration during B16.
- Installed Next.js deployment/output guides under `frontend/node_modules/next/dist/docs/`: standalone output and production server behavior.
