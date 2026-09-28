# QuantumLoop — Backend Tech Stack Decisions

This document records what we chose and why, so anyone on the team (or a judge asking
"why this stack?") has the reasoning without needing to re-derive it. Update this file
whenever a decision changes — don't let it go stale.

## Guiding principles

1. **Follow the frameworks the problem statement names.** Qiskit Aer, PennyLane, Cirq,
   and qBraid are all Python-first. That single fact drives most of the API-layer choice.
2. **Don't overbuild.** Our own research doc flagged auth, chatbots, and cosmetic UI as
   overbuild risks. Where a solved problem exists (auth, code sandboxing), we use it
   instead of writing it ourselves.
3. **Everything currently in `localStorage` needs a real home.** The frontend already
   defines the shape of the data (progress, submissions, contests, discussions) — the
   backend's job is to give that shape a durable, shareable, multi-device store.

---

## API layer — FastAPI (Python 3.11+)

**Implementation baseline:** Python 3.12 is pinned for the initial API/worker images and
CI. SQLAlchemy and Alembic provide sessions and versioned migrations. Use a modular
monolith with feature-owned services and repositories; add quantum worker dependencies
in separately qualified environments as their adapters are implemented.

**Why:** every simulation SDK we need to call is Python-native. Putting the API layer in
a different language (Node, Go) means either shelling out to Python subprocesses or
running a second service just to talk to Qiskit — extra latency and an extra thing to
deploy. FastAPI also gives us async request handling, native WebSocket support (needed
for collaboration and tutor streaming), and auto-generated OpenAPI docs, which is useful
both for the frontend team and for demoing API design to judges.

## Auth — Supabase Auth

**Decision:** Supabase Auth with asymmetric JWT signing. FastAPI verifies the issuer,
audience, signature, and expiry through Supabase's JWKS; the frontend uses the provider's
supported session flow. See [provider configuration](docs/provider-decisions.md).

**Why not build it ourselves:** password reset flows, token rotation, and session
management are exactly the kind of "overly elaborate authentication" our research doc
warned against. A managed auth provider gives us JWTs that FastAPI just verifies on each
request. This also happens to be the first real requirement forced by the collaboration
feature — a party invite link only works if the person clicking it can authenticate from
a different device.

## Database — PostgreSQL

**Why relational, not document-based:** almost everything we're persisting has real
foreign-key relationships — a submission belongs to an assignment which belongs to a
unit, a chat message belongs to a party which has members. That's a natural fit for
Postgres and a bad fit for forcing joins in a document store. **Decision:** Supabase
PostgreSQL, colocated by region with the API and workers as closely as available.

**What lives here:** learner profiles, XP/streaks/badges, quiz and assignment attempts,
instructor feedback, contest entries, discussion threads/votes, party and study-session
records, chat logs, circuit snapshots.

## Cache & job queue — Redis + Celery

**Decision:** two paid Render Key Value instances, one durable `noeviction` broker and
one independent cache/realtime instance. Live TLS, pub/sub, connection-limit, and
restart verification is still required before production use.

**Implementation constraint:** run the durable broker on a separate Redis instance
from evictable caches/rankings. Database numbers and key prefixes do not isolate memory
eviction. Keep business job state/results in PostgreSQL, use an outbox/reconciler, and
assume at-least-once task delivery. Short-lived Celery results are only diagnostic in
the initial scaffold.

**Why:** the frontend already assumes async job semantics exist — `pages.md` describes
"pending" and "service-error" states for remote code grading, which only make sense if
grading happens as a background job, not inline in a request. Pattern: API enqueues a
Celery task, returns a job ID immediately, frontend polls or listens over WebSocket for
completion. Redis sorted sets can serve leaderboard projections rebuilt from
authoritative PostgreSQL scoring records. The cache instance also carries realtime
pub/sub between API instances.

## Quantum simulation layer — custom adapter, not a single SDK

**Why:** the PS explicitly asks for multi-framework support (Qiskit Aer, PennyLane,
Cirq, qBraid), and our research doc's core architectural idea is "don't tie the whole
product to one framework." So we define one interface —
`run_circuit(circuit, backend, shots) -> result` — with a concrete adapter per
framework, including a `QBraidAdapter` that calls qBraid's hosted API rather than a
local package. These run as Celery tasks so a slow simulation (noise modeling, QAOA/VQE
parameter sweeps) doesn't block the request/response cycle or hit an HTTP timeout.

## Code grading — Piston (self-hosted)

**Decision:** deploy Piston on isolated infrastructure with authenticated private
access. Its privileged Docker executor cannot share the API/ordinary worker host.

**Why not build our own sandbox:** container isolation, resource limits, and timeout
handling for arbitrary user code is a solved problem with real security implications if
gotten wrong. Piston and Judge0 are open-source, self-hostable code execution engines
built exactly for this. We call them from a Celery task the same way we call the
simulation adapters.

## AI tutor — OpenAI-compatible interface

**Decision:** start with OpenAI's `gpt-5.4-mini` via the OpenAI SDK's
`chat.completions` interface. Keep model, endpoint, key, and budgets configurable;
evaluate tutor quality before pinning a dated snapshot or changing providers.

Why this matters for us specifically: the "circuit-aware AI tutor" is our headline
differentiator, and we don't want the whole team's integration work thrown away if we
switch models mid-hackathon for cost, latency, or quality reasons. The OpenAI request/
response shape (`messages`, `chat.completions.create`) has become a de facto standard —
OpenAI itself, many open-source/self-hosted models, and proxy layers like LiteLLM all
speak it, and Anthropic also publishes an OpenAI-compatibility layer for Claude.

**How we'll structure it:**
- One internal `ai_tutor` module wraps all model calls. Every call site passes circuit
  JSON, last simulation result, lesson ID, and learner history into a prompt-builder —
  it never talks to a provider SDK directly.
- Provider, base URL, API key, and model name live in environment config, not code.
- Streaming responses go back to the frontend over the same WebSocket/SSE channel we
  already use for the tutor drawer.

Alternative provider compatibility is a future evaluation, not a guarantee of a
configuration-only switch. Prompt semantics, tool schemas, streaming, costs, and safety
behavior must be tested before changing the provider.

## Object storage — Supabase Storage (S3 API)

**Decision:** server-held S3 credentials, with metadata and authorization in Postgres.
Use short-lived signed download links for private artifacts.

**Why:** Circuit Studio's PNG/QASM/JSON exports and uploaded assets need somewhere
to live that isn't the database. Supabase Storage keeps these with the selected data
provider while offering an S3-compatible API.

## Realtime collaboration — Socket.IO on FastAPI + Redis pub/sub

**Why Socket.IO over raw WebSockets:** it gives us rooms (maps directly onto "party" and
"study session"), reconnection handling, and a Redis-backed adapter for cross-instance
broadcast, all of which we'd otherwise write by hand. Redis pub/sub lets a message
reach students on different backend instances. Presence needs its own expiring records
and disconnect/reconnect handling.

**Sync strategy for the MVP:** broadcast-and-apply, not CRDTs. Each client applies its
own circuit edit optimistically and broadcasts it; the server assigns a sequence number
so conflicting edits resolve last-write-wins. Good enough for 2-6 people sketching a
circuit together, and a fraction of the effort of an operational-transform system.
**Stretch upgrade, if time allows:** replace the shared circuit state with a Yjs
(`Y.Map`) document for real conflict-free merging — a genuine "wow" feature, but not
where we should start.

## Deployment

**Build and verification:** GitHub Actions runs backend static/unit checks, production
frontend build/browser tests, and Docker integration tests on every push/PR. A manual
workflow publishes commit-tagged GHCR images only after the complete checks pass.
Cloud deployment remains a separate B23 integration. Local Docker Compose is
development infrastructure, not a production deployment template.

- **Render** — FastAPI web service, Celery workers, and two Key Value instances
- **Supabase** — managed Auth, PostgreSQL, and Storage
- **Isolated host** — private Piston executor

**Why:** all three are real managed cloud services (satisfying the PS's "cloud
deployment readiness" deliverable) without burning hackathon time on infrastructure
provisioning. If judges want to see a growth path, the S3-compatible storage and
Postgres choices both migrate cleanly to AWS (RDS, S3, ECS) later without a rewrite.

---

## Summary table

| Layer | Choice | One-line reason |
|---|---|---|
| API | FastAPI | Same language as every simulation SDK |
| Auth | Supabase Auth | Don't hand-roll auth |
| Database | Supabase PostgreSQL | Relational data, real foreign keys |
| Cache & queue | Two Render Key Value instances + Celery | Durable broker isolated from evictable cache |
| Quantum sim | Custom adapter (Qiskit, PennyLane, Cirq, qBraid) | PS requires multi-framework support |
| Code grading | Isolated self-hosted Piston | Dedicated untrusted-code boundary |
| AI tutor | OpenAI `gpt-5.4-mini` via compatible interface | Evaluate and swap model through config |
| Object storage | Supabase Storage S3 API | S3-compatible, server-side credentials |
| Realtime collab | Socket.IO + Redis pub/sub | Rooms + cross-instance broadcast built in |
| Deployment | Render + Supabase + isolated Piston | Managed API/data and separate grading boundary |
