# QuantumLoop backend implementation plan

## Goal and planning baseline

Implement the backend selected in [tech-stack-decisions.md](tech-stack-decisions.md), replacing browser-only demo services with authenticated, durable, shared services for the journeys in [pages.md](pages.md) and [plan.md](plan.md).

This is an implementation checklist. The repository includes a backend infrastructure scaffold, Docker Compose, GitHub Actions, verified Supabase bearer tokens, durable profiles and cohorts, read-only learner curriculum, locked prediction intake, circuit revisions, and an internal durable job pipeline. Major learning, simulation, grading, tutor, storage, and collaboration flows remain open. Checkboxes remain open until their full acceptance criteria and required tests pass. Existing frontend contracts are the starting point; identity, grading, authorization, and async execution require changes to those contracts.

See [the architecture review](docs/backend-review.md) for identified flaws and resolutions, [development and CI instructions](docs/development.md) for executable checks, and [backend module rules](backend/AGENTS.md) for implementation boundaries.

Primary integration references:

- `frontend/lib/services/contracts.ts`, `api-platform.ts`, and `index.ts`: service interfaces, provisional HTTP routes, and the current demo binding.
- `frontend/lib/studio/types.ts` and `frontend/lib/ai/tutor.ts`: circuit, simulation, and tutor context formats.
- `frontend/lib/coursework/types.ts` and `frontend/lib/assessments/`: assignments, templates, and assessment history.
- `frontend/store/`: browser persistence for sessions, learning progress, coursework, community, circuits, and hardware designs.
- `frontend/lib/curriculum/`, `lib/challenges/`, `lib/algorithms/`, and `lib/hardware/`: content, challenge definitions, algorithm configurations, and hardware rules.

## Scope and build order

P0 establishes the platform and a complete learner/instructor teaching loop. P1 delivers the remaining core quantum, AI, assessment, analytics, and collaboration capabilities. P2 completes the community and hardware surfaces already present in the product. These priorities determine sequencing; P2 is still part of full backend completion. Only the explicit stretch section is optional.

| Task | Priority | Deliverable | Depends on |
| --- | --- | --- | --- |
| B01 | P0 | Provider decisions and API contract | — |
| B02 | P0 | Backend scaffold and local environment | B01 |
| B03 | P0 | Schema conventions, migration infrastructure, and staged data model | B02 |
| B04 | P0 | Managed authentication, roles, and cohorts | B03 |
| B05 | P0 | Curriculum, learning sessions, and prediction contract | B04; B08 for trusted result pairing |
| B06 | P0 | Saved circuits, sharing, and object storage | B04 |
| B07 | P0 | Reliable background jobs | B03–B04 |
| B08 | P0/P1 | Quantum adapter interface and four integrations | B06–B07 |
| B09 | P0 | Assignment publishing, delivery, and feedback | B05–B06 |
| B10 | P0/P1 | Trusted assessments: quiz first, circuit grading next | B05, B09; B08 for circuit grading |
| B11 | P1 | Sandboxed code grading | B07, B10 |
| B12 | P1 | QAOA/VQE optimization services | B08 |
| B13 | P1 | Coordinator, role-scoped tutor, and streaming | B05.P, B08; B10 for missed-question context |
| B14 | P1 | Progress, XP, badges, and recommendations | B05, B08, B10 |
| B15 | P1 | Instructor analytics and content review | B09–B10, B14 |
| B16 | P1 | Parties, study sessions, and shared circuit editing | B04, B06–B07 |
| B17 | P2 | Contests and leaderboards | B10, B14; B11 only for code contests |
| B18 | P2 | Discussions, replies, and votes | B04; B17 for contest association |
| B19 | P2 | Hardware design persistence and validation | B04, B06 |
| B20 | P0, ongoing | Frontend integration and demo-data transition | Each feature API |
| B21 | P0, ongoing | Security, observability, and operational controls | B02 onward |
| B22 | P0 release gate | Automated verification and acceptance journeys | All required features |
| B23 | P0 release gate | Deployment, recovery, and handover | B21–B22 |

Start B20–B23 infrastructure and checks early. Deploy a thin authenticated API and worker before implementing every feature; expand that deployment as milestones pass.

### MVP critical path — learner loop first

For the first demonstrable MVP, prioritize the journey that differentiates QuantumLoop and can run without paid hardware: **sign in → open lesson → save/reopen a circuit → submit a prediction → run the exact saved revision on local Aer → compare the server-derived result → see calibration and tutor guidance**. The required slices are B04, B05.P, B06 circuit library, B07 simulation dispatch/results, B08 local Aer, B13 tutor roles, B20 learner screens, B21 minimum production controls, and B22 keyboard/screen-reader acceptance. Keep these connected end to end before spending time on sharing, storage uploads, qBraid, contests, discussions, or hardware design.

After that learner loop works, add the smallest instructor loop: cohort assignment publishing (B09), server-graded quiz and circuit challenges (B10), learner submission/history, and instructor progress review (B14–B15). Finish deployment and recovery gates (B23) before calling the backend release-ready. This sequence narrows the first release; it does not remove the remaining plan scope.

Within the learning-loop workstream, lock the sequence to **prediction contract and trusted pairing (B05.P/B14) → role-scoped tutor (B13) → persistent comparison UI (B20.P)**. Authentication and a working run/result pipeline remain prerequisites. Start the accessibility workstream with B06/B19/B20 from day one, with its own B22 release gate. This ordering does not require finishing unrelated progress/badge functionality before the tutor.

## Architecture to implement

- FastAPI on the pinned Python 3.12 minor serves REST APIs under `/api/v1`; mount Socket.IO when B16 is implemented. Requalify Python upgrades against quantum SDK wheels before changing the runtime.
- PostgreSQL is the durable source of truth. SQLAlchemy and Alembic are implemented as the database/migration foundation. Add models and migrations with the feature that owns them.
- Celery executes simulation, optimization, grading, export, and scheduled maintenance tasks. Redis supplies the broker, transient caches, rankings, and realtime fan-out.
- Keep durable jobs, results, scores, messages, room revisions, and membership in PostgreSQL. Redis loss must not erase authoritative records.
- A quantum adapter layer normalizes Qiskit Aer, PennyLane, Cirq, and hosted qBraid execution.
- A private Piston service executes untrusted code. User code never runs inside the FastAPI or ordinary Celery process.
- One `ai_tutor` module wraps the configured OpenAI-compatible `chat.completions` client; provider credentials stay on the server.
- S3-compatible storage holds exports and large artifacts; PostgreSQL stores ownership, metadata, checksums, and object keys.
- Keep initial implementation as one modular backend with separately deployed API and workers. Separate worker queues/images where quantum SDK or sandbox dependencies require it.
- Enforce module ownership: routers handle transport, services enforce policy and transactions, repositories access owned tables, and integrations wrap providers. Cross-module calls use explicit public interfaces. Do not import one module's repository into another.
- Use synchronous SQLAlchemy/psycopg inside synchronous FastAPI routes initially; do not block async Socket.IO/streaming handlers with these calls. Bound thread offloads or use a separately managed async session when implementing those handlers.
- Isolate broker Redis from evictable cache Redis at the server level; logical databases/key prefixes do not isolate memory eviction. Cache entries and diagnostic Celery receipts are disposable; business results remain in PostgreSQL.
- Bound database connection counts across API processes and worker concurrency. Separate CPU-heavy quantum workers from network/provider workers when those features arrive; cap native BLAS/OpenMP threads to avoid CPU oversubscription.

Target layout (only infrastructure and health modules exist initially):

```text
backend/
  app/
    main.py
    core/                 # settings, authentication, authorization, errors, logging
    db/                   # sessions and shared database utilities
    modules/              # feature routers, schemas, models, services, repositories
    integrations/         # auth, quantum adapters, code runner, AI client, storage
    jobs/                 # Celery app, tasks, dispatch and reconciliation
    realtime/             # Socket.IO authentication, rooms, events, presence
  migrations/
  tests/                  # unit, integration, contract, security and journey tests
  scripts/                # seed, maintenance, restore and smoke commands
  pyproject.toml
  .env.example
  Dockerfile
compose.yaml
```

## Detailed implementation checklist

### B01 — Finalize provider choices and contracts

- [x] Select one option from each unresolved stack decision: Supabase Auth/PostgreSQL/Storage, isolated Piston, and Render API/workers/Key Value. Record OpenAI `gpt-5.4-mini` and server-only qBraid API v2 configuration in [provider decisions](docs/provider-decisions.md). Deployment and live credentials remain B23/B08 work.
- [ ] Verify selected Redis hosting supports the actual Celery broker and Socket.IO Redis manager connection requirements, including TLS, persistent connections, quotas, and pub/sub. Record the compatible plan or revise the hosting choice explicitly.
- [ ] Pin compatible Python, FastAPI, quantum SDK, Celery, Socket.IO, ORM, migration, and client dependencies; prove installation in the intended worker image.
- [x] Inventory every persistent frontend store and direct local/mock call; map each to an owning backend module and frontend integration task in [frontend state inventory](docs/frontend-state-inventory.md).
- [ ] Specify request/response schemas, stable identifiers, pagination, UTC timestamps, learner timezone handling, and a structured error format with request ID. The shared conventions and route inventory are drafted in [API contract revision 1](docs/api-contract.md); module-specific payloads and generated OpenAPI/TypeScript parity remain open.
- [x] Define API versioning, idempotency keys, optimistic concurrency revisions, and retry behavior for writes in [API contract revision 1](docs/api-contract.md). Existing cohort/profile routes predate these rules and need migration as their modules advance.
- [ ] Extend the existing contracts for profile/settings, coursework, job polling/cancellation, circuits, tutor streaming, cohorts, collaboration, hardware, and exports.
- [ ] Resolve existing contract mismatches: demo password endpoints versus managed auth; client-supplied learner/author/voter IDs; client-visible quiz keys; simulation fields unavailable on remote devices; missing async status methods.
- [ ] Define numerical resource limits, quotas, retention periods, latency/load targets, and cost ceilings before implementation; keep their values configurable.

**Done when:** a recorded provider/configuration matrix and reviewed API/event schemas cover every supported frontend journey without relying on browser identity or browser scores.

### B02 — Scaffold the backend and development environment

- [x] Create the FastAPI application, module structure, settings validation, dependency lockfile, lint/format/type-check commands, and test configuration.
- [ ] Add environment examples for database, Redis, auth issuer/audience, object storage, quantum credentials, grading service, tutor configuration, allowed origins, and limits.
- [x] Configure database pooling and transaction lifecycle for API and worker processes separately. The worker initializes its own engine after fork, uses task-local sessions, and disposes the child pool on exit; a Celery/PostgreSQL round trip verifies the path.
- [ ] Add local containers for API, worker, PostgreSQL, Redis, and development object storage; document the selected sandbox service startup.
- [x] Add liveness/readiness endpoints, structured errors, request IDs, CORS allowlists, and graceful shutdown.
- [ ] Document setup, migration, seed, API, worker, and test commands; validate startup from a clean checkout.

**Done when:** a developer can start the backend and dependencies, open OpenAPI documentation, and execute a database-backed request.

### B03 — Design and migrate the persistent data model

Implement migration infrastructure and the identity foundation first. The following domain groups describe schema ownership to settle here; create their tables, seeds, and indexes incrementally with B04–B19. Do not block authentication behind an unused complete-product schema.

- [x] Model users mapped to auth-provider subjects, preferences, roles, cohorts, instructor memberships, learner enrollments, and invitations.
- [ ] Model versioned curriculum, lessons, quiz questions/answer keys, challenge definitions/rubrics, and faculty review state.
- [ ] Model circuits and revisions, artifacts, share grants, learning sessions, predictions, experiment runs, and optimization iterations.
- [ ] Model template versions, assignment versions, recipients, response drafts, submissions, assessment attempts, grading results, and feedback history.
- [ ] Model activity events, XP ledger entries, badge awards, progress projections, and recommendation inputs.
- [ ] Model tutor conversations/messages, parties, memberships, invitations, study sessions, shared circuit revisions, and chat messages.
- [ ] Model contests, entries, scoring records, threads, replies, votes, hardware designs, jobs, dispatch/outbox records, and audit events.
- [ ] Add foreign keys, uniqueness rules, ownership indexes, pagination indexes, and deletion/retention behavior. Keep relationships relational; reserve versioned JSON for circuit/design snapshots and provider payloads.
- [ ] Create incremental Alembic migrations, migration validation, and deterministic idempotent content seeds preserving existing curriculum/challenge IDs.
- [ ] Separate real curriculum fixtures from explicitly labeled demo users, rankings, and activity. Never seed invented learner achievements into production.

**Done when:** migrations and seeds work on an empty database and an existing database, with referential integrity and duplicate prevention verified.

### B04 — Managed authentication, authorization, and cohorts

The current backend implements operator-only instructor promotion, cohort creation/listing, owner-controlled instructor assignment, member listing/removal, single-use email-bound learner invitations, and revision-protected self-profile/settings edits with an IANA timezone. Browser CORS now allows the required `If-Match` request header and exposes the `ETag` response header. Cohort APIs derive actors from verified tokens; account workflows, connected assignments, and authorization for future resources are still open.

The frontend now has an opt-in Supabase email/password signup, login, and password recovery path, canonical `/me` identity lookup, browser-session restore, token refresh through the provider SDK, local-scope logout, and revision-checked connected profile/settings saves. Demo mode remains explicit. Live-provider verification and other connected feature screens are open; keep the full B04 acceptance item unchecked.

- [ ] Integrate provider signup, login, logout, session refresh, and password recovery through the provider's supported frontend flow.
- [x] Wire config-gated Supabase email/password signup/login, email-confirmation pending state, backend-verified `/me` identity, SDK session restore/refresh, and local-scope logout. No connected identity is persisted in the demo session store. Live multi-account verification remains open.
- [x] Show separate Supabase and local-demo signup choices, preserve signup metadata name on first backend profile creation, and verify confirmation-pending and immediate-session paths in mocked browser tests.
- [x] Connect password-reset email requests and password updates to the Supabase browser SDK, then sign out locally; keep demo recovery explicitly local and cover both paths in mocked browser tests.
- [ ] Verify JWT signature, issuer, audience, expiry, and key rotation in FastAPI and Socket.IO handshakes; define token expiry/revalidation for long connections.
- [x] Create/update local profiles from verified identities. This implementation uses authenticated requests, not webhooks.
- [x] Add self-profile and preferences APIs with timezone validation, `ETag`/`If-Match` revisions, and stale-write rejection.
- [x] Load connected name and preferences from `/me` at sign-in and session restore; save settings with `If-Match`, reload after a 412 conflict, and keep demo settings browser-local.
- [ ] Add account export/deletion workflows and session cleanup on sign-out.
- [ ] Define learner/instructor permissions and an operator-controlled instructor provisioning path. Never accept instructor role selection from the demo UI.
- [ ] Add cohort creation, instructor assignment, enrollment/invitation acceptance, and removal. Scope “all learners” assignments to an authorized cohort.
- [ ] Enforce resource ownership and cohort membership on every read/write, job, file, invitation, and room operation; derive actor identity from authentication.

**Done when:** two real users can sign in on separate browsers, retain their settings, and cannot access another learner's private records or an unrelated cohort.

### B05 — Curriculum and experiment learning sessions

**Current checkpoint:** Read-only unit list/detail routes serve the exported curriculum with stable IDs, lesson content, separate format/content versions, review labels, and placeholder flags. Explicit learner schemas omit checkpoint answer keys and unreleased explanations. Matching prediction submission/pair shapes and a versioned TVD agreement function exist, with explicit 0–100% to 0–1 conversion utilities. Authenticated learners can create durable lesson sessions and immutable locked predictions, then discover them through owner-scoped cursor-paginated lists for cross-device resume. A prediction can bind to one owned Aer run for an exact circuit revision, and a successful run yields a server-derived owner-scoped pair. A bounded, owner-scoped agreement projection exposes recent successful pairs across the learner's sessions for the same lesson version, with unavailable sources identified explicitly. Connected Superposition Learn now renders the learner-safe versioned unit payload; other curriculum and lab pages remain in demo mode. Current authored checkpoint answers heavily favor the first option and frontend demo bundles still contain keys; these checkpoints cannot be trusted for grading. Versioned database content, full stage progress, quiz/glossary/algorithm routes, and full tutor history sources remain open.

- [ ] Serve units, lessons, quizzes, glossary/concept references, and supported algorithm metadata using existing IDs and review labels.
- [ ] Exclude correct answers and unreleased explanations from learner-facing assessment payloads.
- [ ] Add lesson resume/checkpoint/completion APIs and persist Learn → Predict → Build → Run → Observe → Explain → Debug → Challenge → Master session state.
- [x] Add owner-scoped, cursor-paginated session and prediction discovery so saved run/pair IDs can be recovered after refresh or on another device.
- [ ] Persist predictions, reflections, hint usage, recent actions, circuit/run references, and lab stage progress with bounded payloads.
- [ ] Define completion and prerequisite rules, duplicate event behavior, and migration behavior when lesson versions change.
- [ ] Publish capability flags for unavailable tracks and services; retain explicit unavailable states for QFT, Shor, and QEC until separately implemented.

#### B05.P — Prediction contract and immutable result pairing (consolidated item #1)

- [x] Add matching TypeScript and Pydantic schemas for prediction submission and paired prediction/result responses. Include `prediction_vector`, server-derived `simulated_vector`, ordered basis labels, qubit/measurement mapping, schema version, and metric version. These are probability distributions, not complex statevectors.
- [x] Use probabilities in `[0, 1]` on the wire; convert the current UI's percentages explicitly. Require finite values, supported dimensions, nonnegative entries, matching basis order, and total probability within a documented tolerance of 1. Reject invalid inputs rather than silently normalizing them.
- [ ] Persist prediction ID, authenticated learner, lesson/version, learning session, circuit revision/hash, prediction lock time, run ID, and pairing status. Permit a prediction to exist before a run; bind it atomically when the run is requested, and complete the pair only on a successful authorized result.
- [x] Lock the prediction before execution; enforce immutable pairings and uniqueness of `(prediction_id, run_id)`. Edited circuits/new prediction rounds get new identities. Unpaired repeat runs are practice; one locked prediction binds to one run, so repeated sampling cannot inflate agreement history.
- [x] Accept only the learner's prediction as input. Derive the paired simulated distribution from the persisted run; never trust a client-uploaded simulated vector or calibration score. Retain failed/cancelled/pending runs without inventing a paired score.
- [x] Implement `TVD(p,q) = 0.5 * sum(abs(p_i - q_i))` and `prediction_match = 1 - TVD`, versioned and bounded to `[0, 1]`; round only for display. The existing local percentage score already approximates this rule, so preserve its meaning during migration.
- [ ] Record comparison basis (`ideal_probability`, `noisy_probability`, or `sampled_frequency`), backend, shot count, seed, and noise settings. Compare against the quantity the learner was asked to predict; do not mix exact and sampled targets in one unlabeled trend.
- [ ] Describe this metric as prediction agreement. Do not infer statistical confidence calibration, learning gains, or quantum state fidelity from it. Keep any self-reported confidence separately labeled.
- [ ] Define a bounded tutor history projection: recent eligible pairs for the active lesson/concepts, metric/basis/version, attempt IDs, missed-question IDs, hint counts, and allowed next lessons. Cap records/tokens, exclude other learners and hidden answer keys, and return an honest empty state.
- [ ] Test identical/disjoint distributions, basis-order mismatches, invalid sums/NaN/infinity, percentage conversion, authorization, retry deduplication, prediction locking, cancellation, and noisy/sampled comparison labels.

**Done when:** lesson and lab progress resumes on a second device, and a locked prediction is paired with an authorized immutable run/result using the tested, versioned agreement metric.

### B06 — Circuits, revisions, sharing, and storage

**Current checkpoint:** Authenticated learners can create and reopen owner-scoped circuits, list their library with cursor pagination, update them with `If-Match` revision checks, and read immutable historical revision snapshots. Simulation requests pin an exact circuit revision and checksum. Creation requires an idempotency key. The validator bounds qubits, gates, steps, angles, IDs, and payload bytes, rejects collisions, and prevents later operations on measured qubits. Local Aer supports ideal terminal measurement and rejects later gates after a measurement. Archive/restore, sharing, import/export, object storage, accessible browser editing, and connected frontend use remain open.

- [ ] Apply the cross-cutting accessibility workstream below: synchronized readable gate sequence, keyboard placement/editing, and step inspection tied to immutable run snapshots.
- [x] Add a readable, time-ordered gate sequence beside the guided Build grid, with qubit labels, grid-focus and removal actions, live gate-count feedback, and focus recovery after removal. Full Studio parity and screen-reader acceptance remain open.
- [x] Implement owner-scoped circuit create/read/update, immutable revision snapshots, and stale-save checks using `If-Match`.
- [x] Pin every submitted simulation to the exact authorized circuit revision and checksum.
- [ ] Add paginated circuit list and archive/restore lifecycle.
- [x] Validate gate IDs, references, controls, angles, steps, collisions, and bounded payloads; reject unsupported mid-circuit measurement for local Aer.
- [ ] Define and implement reset, measurement collapse, and other dynamic-circuit semantics across supported adapters.
- [ ] Add private-by-default share links with explicit view/edit permissions, expiry, revocation, and safe copy-to-own-library behavior.
- [ ] Implement QASM/JSON/Qiskit export and bounded import parsing. Treat imported Python as text; do not execute it to reconstruct a circuit.
- [ ] Support PNG artifact uploads or export jobs as appropriate to the existing frontend renderer, with size/type checks and ownership checks.
- [ ] Implement signed upload/download URLs, completion validation, artifact metadata, lifecycle cleanup, and deletion of abandoned uploads.
- [ ] Store large simulation artifacts outside PostgreSQL when they exceed configured limits; return authorized links with expiry.

**Done when:** a learner can save, reopen, export, and intentionally share a circuit across devices; stale writes and unauthorized downloads are rejected.

### B07 — Reliable async jobs and event delivery

**Current checkpoint:** Job persistence, transitions, an owner-scoped status read, transactional outbox, and bounded recovery are implemented. Simulation submission now creates a durable run snapshot and job/outbox intent in one transaction, returns `202`, and stores the worker result in PostgreSQL under a fenced lease. Local Aer runs are deterministic/replay-safe; duplicate deliveries cannot replace completed results. Job cancellation/history, additional domain task policies, and release-wide operations remain open.

- [x] Define durable job records and transitions: queued, running, succeeded, failed, cancelled, timed out, and unknown; map them to frontend statuses.
- [x] For local simulation, return `202` plus run/job ID and status URL, then provide owner-scoped run/job status and results.
- [ ] Add authorized cancellation and paginated run/job history endpoints.
- [ ] Create separate Celery queues and concurrency/resource limits for simulation, optimization, code grading, and maintenance/export tasks.
- [x] Use a transactional outbox so committed jobs remain dispatchable through broker outages.
- [x] Make local simulation delivery idempotent across API retries and duplicate worker delivery; other side-effecting tasks remain open.
- [x] Classify local retry/recovery, apply backoff/time limits, and reconcile stale or unclaimed jobs after restarts.
- [ ] Add cancellation propagation for active and queued domain jobs.
- [x] Persist simulation results before response and provide polling recovery for missed notifications.
- [ ] Add realtime completion broadcasts with durable replay where required.
- [x] Separate broker Redis (non-evicting) from cache Redis (evictable).
- [x] Configure broker visibility timeout, prefetch limits, and explicit task acknowledgement/recovery behavior; unknown remote outcomes remain unreplayed.
- [x] Use worker leases/fencing to reject stale completion after retry or cancellation. Remote provider reconciliation remains open.
- [x] Run one Compose dispatcher/reconciler using PostgreSQL row locks, retry, duplicate suppression, and bounded recovery; Redis pub/sub is not authoritative.

**Done when:** a job survives an API restart, recovers from worker interruption, and reaches a truthful terminal state without duplicate side effects.

### B08 — Quantum execution adapters and results

**Current checkpoint:** The local Qiskit Aer adapter executes supported ideal circuits with exact probabilities, seeded shot counts, explicit measured-qubit bit ordering, and bounded optional statevectors. Async run submission is wired through the durable job/outbox worker. The API and migration images omit quantum SDKs; only the worker and test images install the `quantum` dependency group. Prediction pairing, noise, provider-neutral adapter contracts, cancellation, PennyLane, Cirq, and qBraid remain open.

- [ ] Define `run_circuit(circuit, backend, shots)` plus validation, capabilities, cancellation, and normalized error/result contracts.
- [x] Define and test the current local result conventions: gates execute by `(step, qubit, id)`, angles use radians, and result bitstrings follow the explicit left-to-right measured-qubit list.
- [ ] Extend those conventions into the shared multi-provider capability, cancellation, and statistical-tolerance contract.
- [x] Implement Qiskit Aer ideal simulation and shot sampling for saved circuit revisions; bound shots to 8,192, simulator memory to 64 MB, and inline statevectors to five qubits.
- [ ] Add configured noise models and explicit noise/readout result labels.
- [ ] Implement PennyLane and Cirq adapters with explicit supported gate/noise/result capabilities and equivalent circuit translation.
- [ ] Implement hosted qBraid submission, remote job ID persistence, polling, provider timeouts, cancellation where supported, and quota handling.
- [ ] Prevent automatic retries from resubmitting a known remote job; reconcile provider state after connection failures.
- [ ] Normalize counts, probabilities, statevector, Bloch vectors, fidelity, and step snapshots where available. Make unsupported quantities absent with capability metadata; never fabricate statevectors for counts-only devices.
- [ ] Distinguish sampled frequencies from exact probabilities and reduced mixed states from pure states. Record backend, SDK/version, circuit revision, shots, seed, noise settings, and timing.
- [ ] Specify reset/mid-circuit measurement support per adapter; distinguish classical distribution fidelity from quantum state fidelity. Compare statevectors modulo global phase and sampled distributions using statistical tolerances.
- [ ] Enforce qubit/depth/shot/memory/time limits before dispatch; bound exponentially sized statevectors and step snapshots.
- [ ] Validate adapters with analytical basis/Bell/GHZ circuits, rotation/control gates, measurement order, normalization, seeded sampling, and cross-framework comparisons within defined tolerances.

**Done when:** all four integrations execute supported circuits through one API, expose actual capabilities, and report provider failures without presenting local fallback output as remote execution.

### B09 — Assignments, templates, submission drafts, and feedback

- [ ] Implement instructor-owned reusable quiz/code/debug templates with version history and learner preview schemas.
- [ ] Add assignment draft CRUD, recipient selection, due dates, circuit attachment, question editing, and atomic publication of immutable versions.
- [ ] Copy template content into assignment versions so later template edits do not mutate published work.
- [ ] Resolve recipients within the instructor's cohort; implement verified-email targeting/invitation rules and assignment delivery through learner inbox/list APIs.
- [ ] Add learner-visible assignment list/detail, response draft autosave, attempt submission, retry policy, late-submission policy, and history.
- [ ] Bind every submission to the exact assignment/question/circuit version and authenticated learner; make repeat submission requests idempotent.
- [ ] Implement instructor review and feedback with timestamps/history, and synchronize feedback with the unified assessment history.
- [ ] Preserve manual review for code-response assignments unless they explicitly reference an automated grading rubric.

**Done when:** an instructor publishes from one browser, an enrolled learner submits from another, and both see consistent versions, scores, and feedback after reload.

### B10 — Trusted assessments and unified attempt history

- [ ] Implement server grading for unit quizzes and assignment questions with versioned answer keys and controlled explanation release.
- [ ] Implement circuit/lab challenge grading by executing validated submitted circuits against server-held rubrics; ignore client-provided probabilities and scores.
- [ ] Define distribution tolerances, required gates/resource constraints, scoring, pass thresholds, and statistical handling for sampled results.
- [ ] Persist immutable submission snapshots and one normalized attempt record across quiz, circuit, lab, code, and assignment kinds.
- [ ] Expose attempt list/detail/retry/review APIs with pending, graded, and service-error outcomes; distinguish a wrong answer from infrastructure failure.
- [ ] Add authorized regrading with rubric/version provenance and transactional adjustment of derived scores/rewards.

**Done when:** modifying a browser score, learner ID, answer key, or claimed simulation result cannot create a trusted passing attempt.

### B11 — Sandboxed code grading

- [ ] Deploy the selected self-hosted Piston/Judge0 service on isolated infrastructure with authenticated private access.
- [ ] Define supported runtime/libraries, stdin/stdout protocol, public examples, private tests, scoring rubric, and runtime version records.
- [ ] Determine whether challenges require quantum packages; build and verify a compatible sandbox runtime before enabling those challenges.
- [ ] Submit code through Celery with CPU, wall time, memory, process, output, and filesystem limits; deny outbound network and infrastructure credentials.
- [ ] Map compile errors, wrong answers, timeouts, memory failures, and grader outages into useful results without exposing hidden tests or host details.
- [ ] Add quotas, duplicate-request handling, cancellation/cleanup, and retry behavior that does not multiply sandbox runs unnecessarily.

**Done when:** the code practice page completes a real remote grading job, while infinite loops, output floods, filesystem probes, and network attempts remain constrained.

### B12 — Algorithm execution and variational optimization

- [ ] Support the existing Deutsch–Jozsa and Grover configurations, including `grover`/`grovers` alias normalization and validated problem parameters.
- [ ] Implement QAOA Max-Cut jobs with graph validation, parameter/depth bounds, selected optimizer, objective values, iteration history, and best circuit/parameters.
- [ ] Implement VQE jobs with validated Hamiltonians/ansatz, optimizer configuration, energy history, convergence criteria, and bounded evaluation budgets.
- [ ] Preserve the current toy VQE problem's labeling; define any expanded scientific problem separately before claiming chemistry results.
- [ ] Support seeds, cancellation, progress events, partial results, artifact retention, and comparison with saved manual parameter trials.
- [ ] Verify the existing small QAOA/VQE examples against independently calculated expected values or exact diagonalization.

**Done when:** QAOA and VQE run genuine bounded optimizer jobs and return reproducible histories the current workbenches can display.

### B13 — Circuit-aware AI tutor

- [x] Implement the internal `ai_tutor` client and prompt builder using the chosen OpenAI-compatible interface and environment configuration.
- [x] Implement a coordinator and three role-scoped prompt modules within the same service: Pedagogical Guide, Circuit Debugger, and Analytics Planner. This is internal routing, not three new deployed services or an autonomous agent framework.
- [x] Route deterministically by lesson stage, validated execution error, and request type. Use one specialist call by default; define a strict call/token/time budget before allowing combined responses. Record selected role, prompt version, model, and source record IDs.
- [x] Give the Pedagogical Guide the active lesson and authorized experiment context for scaffolded explanations; give the Circuit Debugger circuit JSON, backend capabilities, and sanitized errors for incremental hints without complete assessed solutions.
- [ ] Give the Analytics Planner the bounded B05.P history projection and approved curriculum/challenge candidates. Validate suggested IDs/prerequisites server-side; return a reason and valid next-experiment link, with a deterministic fallback for missing history or invalid output.
- [ ] Keep trusted grading in B10/B11. Tutor roles cannot assign scores, award XP, execute generated code, expose answer keys, or directly apply circuit changes.
- [ ] Load authorized circuit revisions, current/previous results, lesson, prediction, recent actions, and bounded learner history; distinguish unsaved client drafts from verified run records.
- [x] Support explain, changed, unexpected, optimize, and generate actions; persist conversations/messages and source metadata.
- [ ] Add authenticated streaming with request/message IDs, completion/error events, disconnect cancellation, and saved-message recovery.
- [ ] Return generated circuit suggestions as validated structured previews for explicit frontend apply/undo; do not execute model-produced code.
- [ ] Treat learner text and circuit labels as untrusted prompt content; exclude secrets, other learners' data, and hidden assessment answers.
- [ ] Add per-user token/cost limits, bounded context, timeouts, rate-limit handling, redacted logs, and a provider capability check.
- [ ] Evaluate representative teaching prompts, incorrect predictions, noise explanations, and generated circuits; include cases where multi-qubit gates do not imply entanglement.
- [ ] Add role-routing and hint-policy regression cases plus recorded-provider stream/error tests. Compare a representative evaluation set against a single-prompt baseline for correctness, answer leakage, latency, and cost before asserting that specialization improves outcomes.

**Done when:** the coordinator routes to tested role-scoped prompts using authorized prediction/history context within call budgets; explanations stream, recommendations resolve, and invalid suggestions/provider outages recover safely.

### B14 — Progress, XP, streaks, badges, and recommendations

- [ ] Consume the B05.P prediction/result records and shared metric implementation through a public module interface; rebuild calibration projections from those records. Do not maintain a second independent calibration formula in the profile or tutor.
- [ ] Define authoritative learning/activity events and idempotency rules for lesson completion, experiments, assessments, feedback, and hint use.
- [ ] Implement a durable XP ledger, unique badge awards, concept mastery, prediction calibration, activity timeline, and heatmap projections.
- [ ] Specify retake/regrade reward rules, streak day boundaries/timezones, qualifying activity, and protection against repeated-event farming.
- [ ] Expose dashboard and Quantum Passport summaries derived from the same source, including fresh-account empty states.
- [ ] Implement explainable next-step recommendations based on incomplete lessons, prerequisites, weak concepts, and retry opportunities.
- [ ] Add projection rebuild/reconciliation and cache invalidation so database records can repair summaries after failures.

**Done when:** home, profile, attempt history, and rankings agree, and replaying an event cannot inflate XP or badges.

### B15 — Instructor analytics and curriculum review

- [ ] Implement scoped cohort summaries, searchable rosters, learner detail, assignment pulse, and recent activity with pagination.
- [ ] Aggregate missed questions, concept results, hint use, and attention flags from actual enrolled learners and versioned attempts.
- [ ] Document denominator and retake rules; expose reasons for attention flags and avoid inferring a learner's beliefs from a wrong answer.
- [ ] Add curriculum preview and faculty review status/history with authorized publication changes.
- [ ] Optimize aggregate queries and invalidate/rebuild summaries on grading, feedback, enrollment, and content changes.

**Done when:** instructor screens show real cohort data with defensible counts, and unrelated learner records are inaccessible.

### B16 — Parties, study sessions, presence, and collaborative circuits

- [ ] Implement party/session creation, membership roles, owner controls, maximum room size, and expiring/revocable invitations redeemable after authentication.
- [ ] Authenticate Socket.IO connections and every room join/action; use Redis fan-out for multiple API instances.
- [ ] Persist study-session metadata and chat history; track transient presence with heartbeat expiry and explicit disconnect handling.
- [ ] Define edit event schemas with event ID, circuit ID, base revision, actor, and operation payload. Validate permissions and circuit constraints before acceptance.
- [ ] Choose WebSocket-only transport for horizontally scaled MVP rooms, or configure sticky routing if HTTP long-polling is retained. Redis fan-out does not remove the affinity requirement for polling.
- [ ] Assign revisions atomically per shared circuit using a database transaction/lock; persist accepted operations before acknowledging/broadcasting them.
- [ ] Implement the selected last-write-wins policy precisely, including conflicting gate edits/deletes, invalid operations, duplicate events, and rejected optimistic edits.
- [ ] Support reconnect using a last-seen revision and ordered replay or a full snapshot when history is unavailable; never depend on Redis pub/sub for durable replay.
- [ ] Add chat/edit rate limits and immediate room removal when membership is revoked; link shared runs and tutor context to a stable circuit revision.
- [ ] Add the frontend party/join/session controls and event adapter where the current UI lacks production collaboration wiring.

**Done when:** 2–6 users on separate browsers can edit/chat across multiple API instances and converge after disconnects and conflicting edits.

### B17 — Contests and leaderboards

- [ ] Persist contest definitions, schedules, eligibility, scoring rules, tie breakers, attempt limits, and operator/instructor management permissions.
- [ ] Implement entry registration and deadline-enforced submissions bound to a contest/rubric version; use trusted grading services.
- [ ] Complete Bell-pair contest execution first; enable additional/noise contests only after their rubric and backend capability are implemented.
- [ ] Derive participation counts and rankings from real entries and graded submissions; finalize results idempotently.
- [ ] Build Redis sorted sets for global/contest/module and weekly/all-time scopes from durable score/XP records, with rebuild commands and stable pagination/ties.
- [ ] Handle regrades, deletions, disqualification, and Redis loss without corrupting the authoritative ranking; define timezone/week boundaries.

**Done when:** real users enter, submit, and receive consistent rankings that can be rebuilt from PostgreSQL.

### B18 — Discussions, replies, and votes

- [ ] Implement paginated thread listing/detail, creation, replies, and Top/New/Most Replies sorting, including contest-scoped threads.
- [ ] Derive author identity from authentication; enforce ownership and moderator permissions for edits/deletion.
- [ ] Replace retry-sensitive vote toggles with idempotent set/remove operations and a unique user/thread vote constraint.
- [ ] Maintain actual reply/vote counts, validate tags/body lengths, safely render user content, and enforce posting limits.
- [ ] Add report/moderation state and audit changes; define how removed users and deleted posts appear in historical discussions.

**Done when:** users in separate browsers share the same discussion state and cannot impersonate authors or create duplicate votes.

### B19 — Hardware Studio persistence and validation

- [ ] Include keyboard placement/routing, readable design state, focus recovery, and accessible diagnostics in the shared accessibility gate; audit the existing list view before crediting any requirement as complete.
- [ ] Serve versioned component/stage/line catalogs and presets with stable IDs aligned to existing frontend definitions.
- [ ] Implement owned hardware design CRUD, revisions, optional sharing, and export/import through the artifact service.
- [ ] Validate placements, compatible ports/signals, routing, stage constraints, and thermal diagnostics on the server using versioned rules.
- [ ] Use common fixtures to verify parity with existing frontend thermal/rule calculations; label estimates and preserve units/assumptions.
- [ ] Persist linked hardware exercise progress and return stable diagnostics for builder/checks screens; expose hardware tutor support only for implemented context.

**Done when:** designs reopen on another device and server validation agrees with the published rule fixtures.

### B20 — Connect the frontend and transition browser data

- [x] Add a focused, typed learning-loop HTTP client for the implemented session, prediction, circuit, run, pair, and tutor routes. Fetch a current managed-auth bearer token per request; preserve idempotency keys, revision preconditions, and structured service errors.
- [x] Bind the opt-in learning-loop client to the configured Supabase browser session, fetching its current access token for every request. Connected login resolves identity through the authenticated backend `/me` route; demo sign-in remains browser-local.
- [x] Connect the Superposition lab's Run stage to a first Aer path: fetch the live lesson version, create a learner session, lock the ordered prediction, save the exact circuit, submit the paired durable run, poll its status, and show the server-derived sampled comparison. Add a recent-pair recovery action using owner-scoped discovery. Live-provider/browser verification and the full persistent Observe-stage integration remain open.
- [x] Connect the Superposition Build stage to the owned circuit library: list and reopen compatible saved circuits, create a named circuit, and update it with a revision precondition. Preserve gate IDs on reopen and verify recovery after clearing the local draft.
- [x] Keep connected Superposition within the verified learner loop: show server agreement in the header, block local Debug/Challenge/Master grading and local result previews, and expose the accepted saved run link while Aer polling continues.
- [x] Render the learner-safe versioned Superposition lesson in connected Learn before prediction, and show an accessible table of recent server-derived agreement, self-rated confidence, result basis, and shots in Observe.
- [x] Pin a selected owned circuit revision in the connected Aer submission when its gates still match the editor; save a fresh immutable circuit snapshot after an edit. Verify both paths in service tests and the saved-revision path through the learner browser journey.
- [x] Save the Superposition prediction and lesson session when the learner locks Predict, then reuse that immutable prediction for Aer submission. Recover a recent unpaired prediction through owner-scoped discovery after a local draft is lost.
- [x] Connect Settings to the owned `/me` profile, including saved learning preferences, revision preconditions, conflict recovery, and account-scoped session hydration.
- [x] Route connected home to the implemented Superposition learning loop and account settings, with honest scope text; hide browser-demo XP and streak metrics from the connected home shell.
- [ ] Add explicit demo/connected environment selection in `frontend/lib/services/index.ts`, authenticated requests, typed errors, and token-refresh behavior.
- [ ] Set the API adapter base to `/api/v1`; replace provisional password APIs with managed-auth integration and update obsolete actor-ID/vote contracts.
- [ ] Extend adapters and frontend stores for each backend feature. Replace direct local grading, mock tutor calls, coursework reads, and summary calculations in connected mode.
- [ ] Connect job polling/cancellation, tutor streaming, realtime rooms, and capability flags to loading/pending/unavailable/error/retry states.
- [ ] Preserve local UI drafts where useful; define revision conflict handling and clear user-specific caches when switching accounts.
- [ ] Provide an explicit import path for a user's selected local circuit/design drafts. Validate schema versions and deduplicate imports.
- [ ] Keep demo profiles, browser passwords, scores, XP, votes, instructor roles, and sample rankings out of trusted production records; regrade imported answers if an import supports them.
- [ ] Verify each route in `pages.md` against the backend and update user-visible demo/service labels and recovery states accordingly.

#### B20.P — Persistent Predict-vs-Execute view (consolidated item #2)

- [x] Extend the existing `StageObserve` dual view on `/lab/[algorithm]` into a clearly named prediction-versus-actual comparison. The demo comparison includes a numeric table alongside its bars, labels sampled browser results and local prediction agreement, and announces completion/stale state. Server-backed persistence and connected states remain in the following items.
- [x] Submit the first connected Superposition prediction/run pair from the Run stage. Recovery searches the ten most recent owned sessions; multi-page history and browser validation against a live provider remain open.
- [x] Render the backend pair in the connected Superposition Observe stage, resolve a specific owner-scoped `?stage=5&run=<UUID>` URL after reload, validate its lesson and paired IDs, and show the server agreement, metadata, bars, numeric table, stale-editor notice, and low-shot warning. Suppress demo XP awards in this connected path. Live provider, multi-account, and accessibility acceptance remain open.
- [x] Continue from a saved Superposition comparison into connected Explain, recover its immutable run on refresh, show server-derived outcome differences, and load/send owner-scoped tutor messages against that run without a browser-computed score or demo circuit preview.
- [x] Expose the backend's bounded same-lesson agreement history in connected Observe and reopen a selected prior round by its immutable owner-scoped run ID.
- [x] Add a mocked connected browser journey covering managed sign-in, saved-run recovery, prior-round selection, run-bound tutor submission, and tutor-history reload; fix Observe's replayed-effect loading stall.
- [x] Exercise connected Predict → Build → Aer Run → Observe → Explain in a mocked browser, including authenticated write order, polling, idempotency headers, and tutor run context; require a locked prediction for a new run and discard pending results after account changes.
- [x] Remount the lab draft when the connected account changes and verify in a two-tab mocked browser test that the prior learner's gates/results disappear and their saved run is denied to the new learner.
- [x] Give each prediction and confidence slider an accessible name and spoken percentage value; verify keyboard changes reach the saved prediction and that the connected Observe view exposes the resulting numeric comparison table.
- [x] Distinguish queued, failed, unavailable, and completed states when reopening a specific saved run; offer an explicit recheck and verify the transitions in a connected browser journey.
- [x] Reject a run-specific link when the returned run ID or pair references differ, keep the comparison and tutor action hidden, and offer a route to saved-run discovery; cover the mismatch in connected browser and contract tests.
- [x] Follow owner-scoped session and prediction cursors when recovering a recent completed Superposition pair, bounded to five pages of ten at each level; keep empty-state copy aligned with the search window.
- [x] Let the Run-stage recovery action find a newer owned queued/running Aer run after reload, link to its exact status page, and fall back to an older completed pair when the newer run failed; retry discovery errors as discovery requests.
- [x] Clear an older in-memory comparison before opening a recovered run ID, require Observe's visible result to match the URL, and verify a pending run never shows the older table or tutor action.
- [x] Require Explain's visible comparison and tutor context to match the requested saved run ID, recovering that run when the in-memory comparison belongs to another round; verify run-bound tutor replies across saved-run navigation and reload.
- [x] Give direct saved-run links in Explain explicit queued/failed/unavailable recovery: recheck pending work, retry transient errors, and return to saved-run discovery after failure; keep tutor actions hidden until the comparison is ready.
- [x] Bind the connected Predict button to the server lock before advancing to Build; require that saved lock in Run and support bounded recovery of an unpaired lock after refresh.
- [ ] Load the immutable B05.P pair by run ID, including after refresh/on another device. Display prediction, actual distribution, per-outcome signed delta, agreement score, result basis, shots, backend, and circuit revision.
- [ ] Provide side-by-side visual comparison and an equivalent always-available numeric table, readable labels, and concise live announcements. Distinguish missing/pending/failed results, stale current edits, and low-shot sampled uncertainty.
- [ ] Link the paired mismatch/context to the B13 tutor without trusting a browser-recomputed score. Keep previous rounds reviewable and clearly separate from the current unsaved circuit.
- [ ] Add connected browser tests for prediction → run → comparison → tutor context, reload/device resume, mismatched run rejection, keyboard operation, and screen-reader output. Ship this work after B05.P and the role-scoped B13 contract pass.

**Done when:** connected mode uses real services for supported journeys, including persistent prediction/result comparison and the applicable keyboard/screen-reader requirements; browser storage is no longer the shared system of record.

### B21 — Security, observability, and maintenance

- [x] Enforce a configurable API-wide request-body cap for declared and chunked payloads, returning a structured 413 without echoing input; verify valid-body replay and oversized rejection locally.
- [ ] Enforce input/body limits, authorization, rate limits, secure secret storage, restricted CORS, and CSRF protection where cookie-based requests apply.
- [ ] Restrict provider URLs and import/download behavior to prevent arbitrary internal network requests; keep sandbox and infrastructure endpoints private.
- [ ] Emit correlated API/job/provider logs with sensitive fields redacted; record administrative, role, publication, and grading changes in audit history.
- [ ] Measure API latency/errors, queue age, worker failures, provider latency/cost, database saturation, and realtime disconnects; configure actionable alerts.
- [ ] Implement retention/cleanup for uploads, run artifacts, tutor/chat logs, expired invites, and old jobs; apply documented account deletion rules.
- [ ] Add dependency/image scanning and document operational responses to auth-provider, database, Redis, grading, qBraid, and tutor outages.

**Done when:** an operator can diagnose a failed request through its job/provider call and enforce cost, access, and retention policies.

### B22 — Verification and release acceptance

- [ ] After every major task, add its acceptance tests, run its required suites, debug failures, and rerun the affected regression suites before marking it complete. Use the task-specific matrix below.
- [ ] Require GitHub Actions `Required checks` in branch protection; require success on the latest commit. A workflow file alone does not enable repository rules.
- [ ] Keep production-build frontend browser tests and real PostgreSQL/Redis/worker integration tests in CI. Do not use eager Celery or SQLite as evidence that the deployed stack works.
- [ ] Preserve failing test reports/logs/traces. Do not make failures green through retries, skips, ignored types, lower coverage, or weakened assertions.
- [ ] Unit-test authorization policies, state transitions, circuit translation, grading, reward calculations, and hardware rules.
- [ ] Integration-test with real PostgreSQL/Redis: migrations, transactions, outbox recovery, duplicate job delivery, concurrent revisions, and cache rebuilds.
- [ ] Contract-test Pydantic/OpenAPI schemas against TypeScript adapters, including null/optional fields, timestamps, errors, unavailable simulation quantities, and stream events.
- [ ] Test expired/invalid tokens, cross-user/cohort access, invitation misuse, artifact access, answer-key leakage, forged scores, and sandbox escape probes.
- [ ] Run deterministic quantum correctness tests and recorded/mock provider failure tests in CI; run credentialed smoke tests for each enabled external provider before release.
- [ ] Extend browser tests to use separate authenticated accounts and connected services for learner/instructor submission and feedback, lab/tutor, code grading, collaboration, contests/discussions, and hardware save/load.
- [ ] Exercise failure/recovery cases: broker unavailable at submission, worker restart, remote timeout, token expiry, cancelled jobs, lost realtime events, and stale writes.
- [ ] Run bounded load tests against B01 targets for API pagination, representative simulation jobs, queue backlog, and 2–6-member rooms across two API instances.
- [ ] Verify database backup restoration, artifact access after restore, and Redis reconstruction in staging.
- [ ] Complete the WCAG 2.1 AA audit for the defined supported-route scope: automated checks plus documented full keyboard-only and actual screen-reader journeys. Record browser/assistive technology versions, unresolved criteria, and fixes; automated scans alone are not conformance evidence.

**Done when:** all required journeys and security/correctness gates pass with recorded results; remaining unsupported capabilities are explicitly disabled.

### B23 — Deploy and hand over

- [ ] Provision staging/production API, worker queues, scheduler if needed, managed PostgreSQL, compatible Redis, object storage, and the isolated grading service.
- [ ] Configure provider secrets, DNS/TLS, frontend origins, auth redirect URLs, storage CORS, realtime proxy timeouts, and health probes.
- [ ] Build CI/CD gates for static checks, tests, images, and controlled migrations; run migrations once per release before incompatible application traffic.
- [ ] Define API/worker scaling and resource budgets, graceful worker draining, deploy rollback, and backward-compatible database migration policy.
- [ ] Seed approved content, provision instructor/cohort access, and complete deployed smoke tests for all enabled providers and core journeys.
- [ ] Document OpenAPI/event contracts, environment variables, provider setup, quotas, seed/migration commands, backup/restore, job replay/reconciliation, and incident procedures.
- [ ] Update `README.md`, `pages.md`, and stack decisions to reflect deployed behavior and known limitations; prepare a reproducible demo using separate learner/instructor accounts.

**Done when:** the deployed frontend/API/workers support the acceptance journeys, operators can recover data and jobs, and setup instructions work for another developer.

## Milestone acceptance gates

1. **Foundation:** B01–B04 and the initial B07 deployment pass; real users have durable profiles and isolated data.
2. **Teaching loop:** B05–B10 with Qiskit Aer and corresponding B20 integration pass; instructor publishes → learner experiments/submits → server grades → instructor gives feedback.
3. **Core platform:** all B08 adapters and B11–B16 pass; real code grading, optimizer jobs, tutor streaming, progress, analytics, and collaboration work across devices.
4. **Complete product surface:** B17–B20 pass; contests, discussions, rankings, hardware, and all existing route integrations use durable services.
5. **Release:** B21–B23 pass against recorded correctness, security, recovery, and operational targets.

## Explicit stretch work

- [ ] Replace sequence-based collaborative circuit merging with Yjs/CRDT synchronization after the MVP room protocol is stable.
- [ ] Add QFT, Shor, and QEC learning/execution tracks with separately defined content and grading requirements.
- [ ] Add additional hardware providers, larger scientific workloads, advanced tutor retrieval, or migration to AWS infrastructure only when the implemented product requires them.

Stretch items do not block the milestones above. The four selected simulation integrations, bounded QAOA/VQE optimization, trusted grading, circuit-aware tutor, and durable collaboration are required scope.

## Test gate after every major task

Run `make backend-check backend-test` after each backend change, then the task-specific suites below. Run `make test-integration` for persistence, worker, settings, and Docker changes; run `make frontend-check` for contracts or frontend behavior. `make test-all` is the complete local gate. CI runs all current suites on every push/PR. Future task suites must be added as real tests, not empty directories or skipped placeholders.

| Task | Required acceptance coverage before completion |
| --- | --- |
| B01 | Contract serialization/error cases, dependency installation, provider capability probes |
| B02 | Configuration rejection, liveness/readiness, API errors, container startup |
| B03 | Fresh upgrade, upgrade from previous release, schema drift, constraints, seed idempotency |
| B04 | Expiry/key rotation, cross-user/cohort authorization, role escalation, invitation replay |
| B05 | Resume/version transitions, hidden answer exclusion, prediction locking/pairing, vector validation, deterministic TVD fixtures |
| B06 | Revision conflicts, unauthorized sharing/download, import limits, keyboard editing, synchronized gate sequence/state inspection |
| B07 | Duplicate delivery, broker outage, worker termination, cancellation race, outbox replay |
| B08 | Analytical/cross-framework circuits, global phase, noise/measurement semantics, provider timeout |
| B09 | Separate instructor/learner publish-submit-feedback journey, immutable versions, duplicate submit |
| B10 | Tampered scores/results, server rubric evaluation, statistical tolerances, regrade/reward consistency |
| B11 | Real sandbox execution, timeout/memory/output limits, forbidden network/host access, grader outage |
| B12 | Exact small-problem references, bounded convergence/evaluations, cancellation, repeatable seeds |
| B13 | Role routing, protected history, hint/answer leakage, streaming recovery, invalid recommendations/circuits, bounded cost |
| B14 | Duplicate/reordered events, timezone/streak boundaries, retakes, calibration basis/version separation, projection rebuild |
| B15 | Cohort isolation, retake denominators, attention reasons, aggregate correctness/query bounds |
| B16 | Two API instances, concurrent edits, replay gaps, expired auth, revoked membership, snapshot convergence |
| B17 | Deadline boundaries, ties, duplicate grading, disqualification, ranking rebuild |
| B18 | Author spoofing, idempotent voting, safe rendering, pagination, moderation permissions |
| B19 | Validation parity, units/thermal assumptions, revision/ownership conflicts, keyboard placement/routing and readable diagnostics |
| B20 | Connected prediction/run/tutor journey, account-switch isolation, no trusted demo import, keyboard and live-result behavior |
| B21 | Rate/resource limits, log redaction, retention, alerts, provider/network failure behavior |
| B22 | Full regression, failure injection, load, restore rehearsal, documented keyboard-only and screen-reader passes, WCAG audit |
| B23 | Fresh deployed smoke, migration compatibility, worker draining, rollback and recovery |

For each completed task, record the commit, exact commands, passing counts, and any deferred external-provider check in the PR. An unavailable required service leaves that acceptance criterion open; it is not a pass. CI reduces regression risk but cannot promise error-free implementation.

## QuantumLoop — Final Consolidated Plan

This consolidation extends B01–B23 and preserves their engineering gates. Numbered items below retain the supplied #1–#17 identifiers. “Verified capability” means a source or code path exists; it does not mean our integration, usability, learning outcomes, or market uniqueness has been verified.

### Repository and evidence corrections — checked 2026-09-28

| Supplied assumption | Checked finding | Implementation consequence |
| --- | --- | --- |
| Prediction comparison is under-surfaced or missing | `components/lab/stages/stage-observe.tsx` already has “Prediction Ghost vs Simulated Outcome,” Dual View, and a local sampled-results comparison | Extend and persist this existing view through B20.P; avoid duplicating it |
| Prediction/result history needs a contract | `lib/lab-context.tsx` stores hypotheses and results in browser sessions; `use-learner-progress.ts` keeps only algorithm/score/time calibration summaries | Preserve full server-authorized prediction/run pairs, provenance, and metric versions in B05.P |
| Noise Lab is absent from the project | `components/studio/NoiseLab.tsx`, `ResultsPanel.tsx`, and lab `StageObserve` contain local noise controls/previews; B08 already includes noise settings | Scope a real Aer-backed upgrade and truthful labels; do not build a second Noise Lab |
| Inspect-mode parity might already exist | `StepScrubber.tsx` changes `stepIndex`, and `CircuitCanvas.tsx` highlights steps; `ResultsPanel.tsx` reads the final `result`, not selected `stepStates`. The range input also lacks an accessible name | Partial implementation only: add synchronized state inspection, an accessible slider name/value, stale-run handling, and keyboard acceptance tests under B06/B20 |
| Accessibility is verified by route descriptions | Hardware has a list view and Studio has a statevector table, but these do not establish complete keyboard/screen-reader support; Studio's placement slots are non-focusable `div`s | Conduct the full implementation audit below; do not mark accessibility complete from these partial features |
| The ODU pilot has no quantitative metrics | It reports interaction/execution counts, but no controlled evidence that learning improves; the authors identify a single-course/site scope and lack of a control group | Use it as limited architectural evidence, not a causal learning-effect claim or proof of our proposed role split |
| Signed completion credentials are only pitch/copy work | Issuance, verification, revocation, signing, and privacy require backend/frontend behavior | Track B14.C engineering separately from credential design and pitch copy |

The ODU evidence is [Elhaimeur & Chrisochoides, *From Prototype to Classroom*](https://arxiv.org/html/2604.24807v1). Our Coordinator/Guide/Debugger/Planner design is an adaptation; the paper's exact roles and execution strategy differ. “No competitor offers this loop” is not an established finding here. Present the persistent learning loop as our product emphasis unless a separately documented comparative review supports a narrower claim.

### Tier 1 — Committed learning-loop work, with an explicit sequence

| Item | Owning task | Required result |
| --- | --- | --- |
| #1 Prediction contract | B05.P, B08, B14 | Validated probability distributions, immutable authorized prediction/run pairs, TVD agreement, bounded tutor history |
| #3 Spoke-and-Wheel tutor | B13 after B05.P | One coordinator and three role-scoped prompts through one configured client, with routing/evaluation/budget controls |
| #2 Predict-vs-Execute UI | B20.P after B05.P and B13 | Existing comparison promoted into a named, persistent, accessible view with truthful provenance |
| #4 Platform accessibility | B06, B19, B20, B22 throughout | Audited keyboard and screen-reader operation with equivalent numerical information and timing controls |

Execute **#1 → #3 → #2**, with **#4 as an ongoing workstream from the start**. Complete the foundation/auth/run prerequisites first. The B05.P metric/history interface can be built before the rest of B14, avoiding a circular dependency between progress and tutor work.

#### #4 — Accessibility workstream (cross-cutting requirement)

Target [WCAG 2.1 Level AA](https://www.w3.org/TR/WCAG21/) across the defined supported journeys. The items below are focused product requirements, not an exhaustive WCAG checklist; B22 must also assess applicable contrast, reflow, labels/errors, focus, structure, and other Level A/AA criteria.

- [ ] Inventory actual Studio, lab, hardware, quiz, and contest controls with keyboard and screen-reader use. Record current behavior, gaps, and owning task; do not infer completion from `pages.md` or drag-library defaults.
- [ ] Add a synchronized readable gate-sequence representation to Circuit Studio: stable order, gate names, parameters, controls/targets, time steps, selection, and edit/delete actions tied to the same circuit store. Keep it available alongside the canvas, not only in code export or error fallback.
- [ ] Provide select-then-place and keyboard-complete placement, routing, moving, reordering, editing, and removal wherever gates/components currently rely on dragging. Preserve focus after mutations and provide undo/status feedback.
- [ ] Make histograms, statevectors, Bloch coordinates/mixed-state indicators, optimization histories, and prediction deltas available as labeled numeric/tabular content. Include true zero values and unavailable quantities explicitly; do not require WebGL failure to reveal alternatives.
- [ ] Add concise `aria-live`/status announcements for queued, completed, failed, and cancelled runs and measurement changes. Batch streamed tutor updates so screen readers are not flooded token by token; preserve user control of focus.
- [ ] Extend the existing reduced-motion preference through inspection/animation flows while treating keyboard operation as a separate requirement. Give the step scrubber an accessible name and current-step value; synchronize selected run state, readable sequence, and visual highlight.
- [ ] Add removable/extendable individual quiz timers and contest accommodations where timing applies. Enforce granted timing policy on the server, record changes, and distinguish individual countdowns from the event's published deadline. Document any essential real-time exception and provide an equivalent untimed practice journey.
- [ ] Add automated accessibility checks and focused Playwright keyboard journeys with each affected feature. In B22, also record a full keyboard-only pass and actual screen-reader passes (for example NVDA/Chrome and VoiceOver/Safari), including browser/OS versions, result-table reading, live updates, placement, submission, and focus recovery.
- [ ] Publish an accessibility statement and judge-facing claim only after the documented audit. Describe tested scope and remaining limitations; reduced motion or a clean automated scan alone is insufficient.

### Tier 2 — Scope each capability before committing implementation

For each item, produce a short decision note with a minimal demonstrator, compatible pinned versions, license/deployment constraints, benefit over the existing path, resource cost, acceptance tests, and adopt/defer outcome. Core B08/B12 functionality must continue even if these optional enhancements are deferred.

#### #5 — Aer-backed Noise Lab (B08/B20)

- [ ] Audit current Studio depolarizing/readout controls and the lab's mix-toward-uniform preview. Specify what the current percentages mean before mapping them to a physical channel.
- [ ] Prototype one-qubit/two-qubit depolarizing errors and readout error through Aer `NoiseModel`; define gate basis/transpilation effects, ideal/noisy/sampled outputs, seeds, and resource limits.
- [ ] Decide which existing controls to connect and which approximations to retain with labels. Compare zero-noise and known-noise reference cases, prohibit fidelity-name ambiguity, and give the noisy run its own immutable provenance.
- [ ] Scope advanced noise sources/device-calibration imports separately; do not imply hardware realism from a uniform-mixing preview. Aer supports noise models, but project fit and parameter semantics still require this work. See [IBM's noise-model guide](https://quantum.cloud.ibm.com/docs/en/guides/build-noise-models).

#### #6 — Cross-framework result comparison and qBraid tooling (B08/B20)

- [ ] Prototype comparison of the same canonical circuit through already-required adapters before introducing a transpiler dependency. Group comparison runs by circuit/measurement/noise specification and display provenance, unsupported capabilities, time, and cost.
- [ ] Evaluate qBraid's conversion graph and visualization package against the selected SDK versions, licenses, gate set, dynamic measurement support, and worker image. Prove each needed direction; do not assume a lossless fully connected Qiskit↔PennyLane↔Cirq↔OpenQASM conversion graph.
- [ ] Test bit order, global phase, supported-gate equivalence, sampled uncertainty, and partial provider failure. Use optional conversion tools behind an adapter; keep hosted qBraid execution distinct from local transpilation.
- [ ] Adopt only if it improves the existing normalized-result path within dependency/cost limits. Conversion capability is documented in [qBraid's transpiler guide](https://docs.qbraid.com/v2/sdk/user-guide/transpiler); exact project compatibility remains untested.

#### #7 — qBraid algorithms for QAOA (B12)

- [ ] Reproduce the existing three-vertex Max-Cut problem with `qbraid-algorithms`; compare objective normalization, parameter order, optimizer callbacks, seeds, iteration limits, and result extraction against our B12 contract.
- [ ] Verify install/version compatibility in an isolated worker image, maintained API surface, license, and runtime/cost behavior before adoption.
- [ ] Keep the implementation swappable behind the optimizer interface. Do not assume VQE support or add extra graph problems merely because the package provides them.
- [ ] Record adopt/defer and regression fixtures. [The project's release notes](https://github.com/qBraid/qbraid-algorithms/releases) document QAOA graph-problem support in February 2026; they do not establish our integration fit.

#### #8 — Applications-oriented curriculum (B05/B12/B15)

- [ ] Audit all nine existing units, prerequisites, faculty-review status, and QAOA/VQE examples; choose whether to enrich an existing unit or add a tenth, with a content migration/ID plan.
- [ ] Scope one concrete application using an implemented solver and explain its toy-model limits. Logistics/Max-Cut and simulation/VQE are candidates; finance/Monte Carlo adds content/solver scope and is not automatically included.
- [ ] Specify learning outcomes, accessible worked examples, prediction exercise, graded rubric, and instructor review. Separate content-authoring effort from platform engineering.

### Tier 3 — Polish and presentation, with actual effort separated

#### #9 — Shareable/verifiable completion credentials (B14.C, then B20/B23)

- [ ] Scope a small completion credential based only on server-verified completion of a versioned course/assessment policy. Keep badges and accredited qualifications distinct.
- [ ] Implement idempotent issuance with credential ID, issuer, subject display identity, course/version, completion criteria, issuance timestamp, signing algorithm/key ID, and revocation state. Use managed secret/key storage and document key rotation.
- [ ] Provide a downloadable signed artifact and opt-in public verification endpoint/page or verification link. Show only agreed public fields, avoid emails/internal learner history, handle unknown/revoked credentials, and define deletion behavior.
- [ ] Test forgery, duplicate issue, changed completion policy, authorization, revocation, key rotation, and public-field exposure. An offline signature proves integrity; current revocation requires an online check.
- [ ] Assign certificate visuals and workforce-development pitch copy separately from implementation. This is modest feature engineering, not zero-effort copy work; sequence it after trusted completion exists.

#### #10 — Narrative-named challenges (content owner; B05/B10 catalog)

- [ ] Add original memorable display titles and short story prompts while preserving stable IDs, underlying difficulty/concept tags, rubrics, and links. Avoid unnecessary architecture or route changes.
- [ ] Review scientific accuracy and confirm search/filter/readability and existing catalog tests still work. This can fit between engineering milestones.

#### #11 — Accessibility pitch claim (content owner after #4/B22)

- [ ] Translate documented accessibility outcomes into specific demonstrable claims; link the audit/statement. Do not claim WCAG conformance before the defined scope has been assessed.

#### #12 — Flagship contest event (content/event owner; existing B17)

- [ ] Frame an original QuantumLoop event around existing contests, with rules, schedule, eligibility, accommodations, support, and moderation ownership. QHack is inspiration, not an affiliation or proof that our event operations exist.
- [ ] Allocate pitch/event preparation separately. Add engineering work only if the event requires capabilities beyond B17, and scope those before promising them.

#### #13 — Inspect-mode parity check (review completed; fixes belong to B06/B20)

The source audit found working previous/next buttons and a native range control for highlighting, but no selected-step binding in Studio's result panel and no accessible slider name. Do not call this full live-state inspection or IBM parity. Extend the existing component, then test arrow-key stepping, first/last boundaries, circuit changes that invalidate a step, state table/Bloch updates, and unavailable remote step snapshots. The source check is complete; the implementation and assistive-technology checks remain open.

### Already covered — no duplicate implementation tracks

- **#14 Managed auth/cohort scoping:** B04.
- **#15 Trusted server-side circuit grading:** B10; ignore client-submitted scores/results.
- **#16 Durable async execution:** B07; PostgreSQL job/outbox state with Celery and isolated Redis services.
- **#17 Instructor misconception/question-pattern analytics:** B15; describe observed errors without asserting unmeasured learner beliefs.

### Explicitly discarded

Do not revive competitor-repository intelligence based on GitHub name searches for Qylo or similarly named “Egreen Quanta” repositories. The supplied project context identifies Egreen Quanta as the problem-statement sponsor; repository-name resemblance supplies no evidence of a rival implementation.

### Ownership and completion rule

Engineering owns #1–#4 and any adopted #5–#7 enhancements; curriculum/faculty owns #8 and #10, with engineering support only where needed. #9 has separate engineering and design/content owners. Presentation/event owners handle #11–#12 after their prerequisites. #13's verified gaps are assigned to existing engineering tasks. Named individuals can be assigned during sprint planning; no task is assumed delegated here.

Every adopted item inherits its B-task test gate. Add prediction/metric/role-routing suites as part of Tier 1, and accessibility checks alongside every relevant UI change. After each major task, run the suite, debug failures, and rerun affected regression tests before starting dependent work or marking completion.
