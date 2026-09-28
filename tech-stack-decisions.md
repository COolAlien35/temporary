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

## Auth — Clerk or Supabase Auth

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
Postgres and a bad fit for forcing joins in a document store. Managed hosting (Neon or
Supabase) gets us there without running our own database server.

**What lives here:** learner profiles, XP/streaks/badges, quiz and assignment attempts,
instructor feedback, contest entries, discussion threads/votes, party and study-session
records, chat logs, circuit snapshots.

## Cache & job queue — Redis + Celery

**Implementation constraint:** run the durable broker on a separate Redis instance
from evictable caches/rankings. Database numbers and key prefixes do not isolate memory
eviction. Keep business job state/results in PostgreSQL, use an outbox/reconciler, and
assume at-least-once task delivery. Short-lived Celery results are only diagnostic in
the initial scaffold.

**Why:** the frontend already assumes async job semantics exist — `pages.md` describes
"pending" and "service-error" states for remote code grading, which only make sense if
grading happens as a background job, not inline in a request. Pattern: API enqueues a
Celery task, returns a job ID immediately, frontend polls or listens over WebSocket for
completion. Redis also gives us the leaderboard for free (sorted sets are a natural fit
for global/contest/module × weekly/all-time ranking) and doubles as the pub/sub backbone
for realtime collaboration.

## Quantum simulation layer — custom adapter, not a single SDK

**Why:** the PS explicitly asks for multi-framework support (Qiskit Aer, PennyLane,
Cirq, qBraid), and our research doc's core architectural idea is "don't tie the whole
product to one framework." So we define one interface —
`run_circuit(circuit, backend, shots) -> result` — with a concrete adapter per
framework, including a `QBraidAdapter` that calls qBraid's hosted API rather than a
local package. These run as Celery tasks so a slow simulation (noise modeling, QAOA/VQE
parameter sweeps) doesn't block the request/response cycle or hit an HTTP timeout.

## Code grading — Piston or Judge0 (self-hosted)

**Why not build our own sandbox:** container isolation, resource limits, and timeout
handling for arbitrary user code is a solved problem with real security implications if
gotten wrong. Piston and Judge0 are open-source, self-hostable code execution engines
built exactly for this. We call them from a Celery task the same way we call the
simulation adapters.

## AI tutor — OpenAI-compatible interface

**Decision: call the model through the OpenAI SDK's `chat.completions` interface, not a
provider-specific SDK, so the provider behind it is a config change, not a code change.**

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

**On using Claude specifically through this interface:** Anthropic's OpenAI SDK
compatibility layer works by pointing the OpenAI Python/TS SDK's `base_url` at
`https://api.anthropic.com/v1/` and using a Claude model name — no other code changes.
Anthropic is explicit that this layer is meant for **testing and evaluation**, not as a
long-term production path, and it has real gaps we should design around if we go this
route: no prompt caching (so repeated system-prompt context costs more per call than the
native SDK would), no audio input, system messages get concatenated into one block
instead of staying separate, temperature is capped at 1.0, `n` must be 1, there's no
embeddings endpoint, and function-calling's `strict` schema guarantee isn't enforced. If
the tutor ends up needing prompt caching (likely, since the circuit-context system prompt
repeats a lot) or guaranteed structured output, that's the point to move that call site to
Anthropic's native SDK — the rest of the app is unaffected either way, because the
prompt-builder and call sites don't change, only the client configuration behind
`ai_tutor` does.

## Object storage — S3-compatible (Cloudflare R2 or Supabase Storage)

**Why:** Circuit Studio's PNG/QASM/JSON exports and any uploaded assets need somewhere
to live that isn't the database. R2/Supabase avoid a full AWS account for a hackathon
timeline while staying S3-API-compatible if we ever do move to AWS.

## Realtime collaboration — Socket.IO on FastAPI + Redis pub/sub

**Why Socket.IO over raw WebSockets:** it gives us rooms (maps directly onto "party" and
"study session"), reconnection handling, and a Redis-backed adapter for cross-instance
broadcast, all of which we'd otherwise write by hand. Redis pub/sub is what lets a
message from one student reach another even if they're connected to different backend
instances, and it also gives us presence (who's currently in the room).

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
Cloud deployment remains a separate integration after hosting/auth/storage choices
are finalized. Local Docker Compose is development infrastructure, not a production
deployment template.

- **Render or Railway** — FastAPI app + Celery workers
- **Neon or Supabase** — managed PostgreSQL
- **Upstash** — managed Redis

**Why:** all three are real managed cloud services (satisfying the PS's "cloud
deployment readiness" deliverable) without burning hackathon time on infrastructure
provisioning. If judges want to see a growth path, the S3-compatible storage and
Postgres choices both migrate cleanly to AWS (RDS, S3, ECS) later without a rewrite.

---

## Summary table

| Layer | Choice | One-line reason |
|---|---|---|
| API | FastAPI | Same language as every simulation SDK |
| Auth | Clerk / Supabase Auth | Don't hand-roll auth |
| Database | PostgreSQL (Neon/Supabase) | Relational data, real foreign keys |
| Cache & queue | Redis + Celery | Async jobs the frontend already expects |
| Quantum sim | Custom adapter (Qiskit, PennyLane, Cirq, qBraid) | PS requires multi-framework support |
| Code grading | Piston / Judge0 | Sandboxing is a solved problem |
| AI tutor | OpenAI-compatible interface | Swap providers via config, not code |
| Object storage | Cloudflare R2 / Supabase Storage | S3-compatible, no AWS setup needed |
| Realtime collab | Socket.IO + Redis pub/sub | Rooms + cross-instance broadcast built in |
| Deployment | Render/Railway + Neon + Upstash | Real managed cloud, fast to stand up |
