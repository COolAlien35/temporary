# Parties and Studio inspection

Connected Circuit Studio and Hardware Studio support authenticated study parties with 2–6 members. Create a party from **Collaborate**, generate an invitation, then **Open your party**. Share the invitation manually. The recipient signs in with a connected account and opens the link. Circuit invitations open `/studio#invite=…`; hardware invitations open `/hardware/studio#invite=…`. Demo mode generates snapshot links that open separate copies; live editing and chat require connected accounts.

The owner chooses edit, comment, or view access and can restrict an invitation to a verified email. Invitations expire after 1–168 hours and can be revoked. Removing a member permanently blocks that member from redeeming the same party's invitations. The owner closes the party instead of leaving ownership vacant. Closing preserves durable history but denies further access. Party circuits are separate from personal circuits; changes to a party do not overwrite a participant's original local draft.

## Protocol and persistence

REST endpoints are under `/api/v1`:

| Endpoint | Behavior |
| --- | --- |
| `POST /parties` | Create `{circuit, capacity}` or `{kind: "hardware", design, capacity}` with a UUID `Idempotency-Key` |
| `GET /parties/{id}?after=N` | Authorized snapshot, member roles, last 50 chat messages, and up to 100 ordered events |
| `POST /parties/{id}/invitations` | Owner creates `{role, email?, hours}`; returns the secret token once |
| `POST /party-invitations/accept` | Redeem `{token}` after authentication; joining is idempotent and capacity is locked |
| `DELETE /parties/{id}/invitations/{invite}` | Owner revokes an invitation |
| `DELETE /parties/{id}/members/{profile}` | Owner removes a member, or a non-owner leaves |
| `DELETE /parties/{id}` | Owner closes the party |
| `POST /parties/{id}/actions` | Apply an authorized, validated, idempotent chat or edit event |
| `POST /parties/{id}/circuit-copy` | Freeze `{revision}` with a UUID key and create an owned immutable circuit copy |

Actions contain `event_id`, `circuit_id` (the party ID), `base_revision`, and `kind`. `upsert` includes a complete validated `gate`; `delete` includes `gate_id`; `settings` contains `name` and/or `qubits`; `chat` contains plain `text`. Extra fields, including a spoofed actor, are rejected. Actor IDs are derived from verified tokens. The party row lock serializes membership and all accepted events; revisions include membership, chat, closure, and circuit changes.

Snapshots include `kind: "circuit" | "hardware"`. Hardware actions use `kind: "hardware"` with `changes: {stages?, placed?, routes?, meta?}`. Each entity collection accepts `{upsert: [complete entities], delete: [IDs]}`; omitted collections are unchanged. Edits apply atomically to the latest document, replacing matching IDs in server acceptance order while preserving unrelated edits. Stage deletion removes components on that stage and their wiring; component deletion removes attached routes, including wiring added since the sender's base revision. Metadata changes require the exact current revision. Contradictory changes, unknown catalog components/ports, duplicate IDs, missing endpoints/stages, reused single-connection ports, non-finite values, and excessive documents are rejected without advancing revision. Scientific compatibility and thermal estimates remain the existing browser diagnostics, so structurally valid designs can contain educational errors for learners to debug.

Whole gates merge in server acceptance order. A stale upsert replaces that gate ID in the latest snapshot; a stale delete removes it. A later upsert can explicitly recreate a deleted ID. Independent gate edits survive. Slot collisions, invalid controls, out-of-range qubits, and post-measurement gates are rejected without advancing the revision. Circuit name/qubit changes require the exact current revision. Repeated event IDs return the original acknowledgment only for the same actor and exact payload. Rejected optimistic edits reload the authoritative state; network retries retain their event IDs and payloads.

Socket.IO runs at `/socket.io/` with **WebSocket-only** transport and the configured CORS allowlist, following the [Socket.IO multiple-server guidance](https://python-socketio.readthedocs.io/en/latest/server.html). Connect with `{token}`, then `join` with `{party_id, after}`; `action` accepts the same action schema and `heartbeat` rechecks authorization and renews a 30-second presence entry. Connections are disconnected at token expiry, and membership is checked every dispatcher pass. Presence counts describe live connections, not unique people. Redis presence is transient.

Each API instance runs a bounded PostgreSQL notification outbox pump. The event commits before acknowledgment. Redis `ql-parties` messages carry only party ID/revision hints to authenticated profile rooms. Publication failure leaves the event pending; a crash can duplicate a hint. The browser fetches authorized snapshots and ignores older revisions, and polls every ten seconds to recover missed hints. If more than 100 events were missed, replay returns `replay_complete=false` with a complete current snapshot. Redis loss cannot erase circuits or chat.

Limits: 10 active owned parties, 20 active invitations per party, 120 accepted actions per actor per minute, 2,000 characters per chat message, and the existing circuit limits (8 qubits, 256 gates, 32 KB). The Studio editor currently supports five qubits. Production API processes need persistent Redis connections/pub/sub and WebSocket proxy support; no polling affinity is required.

Hardware documents are bounded to 64 KiB, 16 stages, 128 placed components, 256 routes, and 64 waypoints per route. Component/port definitions are exported from the frontend catalog into the party module; `pnpm hardware:check` verifies parity in the frontend gate. Hardware pointer changes are coalesced after 150 milliseconds of inactivity into one atomic edit. The personal hardware draft remains in localStorage while shared changes persist in PostgreSQL; leaving, closing, or losing membership restores that personal draft. Explicit hardware Save still stores a local personal copy; general owned hardware CRUD, cloud exports, and server scientific validation remain B19 work. Hardware rooms do not expose the quantum Aer/tutor controls.

## Saved runs and tutor context

**Run saved party revision on Aer** freezes the current authorized source in PostgreSQL, then copies it through the circuits public interface. Retries reuse that immutable source even if the party subsequently changes. The existing durable job service executes the resulting owned circuit revision; the panel shows server counts, run ID, source party revision, and circuit revision. It never labels the toolbar's browser simulation as an Aer run.

**Explain saved circuit** sends the immutable owned circuit ID/revision to the existing tutor. It uses the current Foundations lesson version and shows the persisted message ID and role. Shared runs without a prediction are not supplied as prediction/run pairs, preserving the tutor's existing pairing checks. Configure the real tutor provider on the server to use this action outside the test fixture.

## Selected state inspection

Studio's readable gate table stays connected to the canvas/store and the party adapter. It supports keyboard addition, placement, moving by step/qubit, angle/control editing, deletion, focus recovery, and undo through existing Studio controls. The selected scrubber step drives ideal statevector probabilities and Bloch coordinates. All zero amplitudes remain readable; phase is unavailable at zero amplitude. Numeric histogram and Bloch tables remain available alongside graphics.

The scrubber has a name and spoken time-step value, respects first/last boundaries, and disables until the current circuit has a matching run. A gate change clears the selected step and labels the previous result as stale. Sampled counts always refer to the final saved run, not an intermediate ideal state. These are focused keyboard checks; full WCAG and actual screen-reader acceptance remain B22 work.

## Local acceptance

Run migrations and the worker first (`make test-integration`). Then run `make test-parties`; the fixture starts two native API instances and separate browser accounts, using locally signed JWTs and a stub JWKS/provider boundary. The circuit scenario uses two accounts; the hardware scenario adds a third view-only account. PostgreSQL, Redis, Celery, and Aer are real. The browser routes its second account's HTTP and WebSocket connections to the second API instance. Hardware checks cover shared placement/wiring, offline/reload recovery, chat, role rejection, party closure, and personal draft restoration. The tutor response is a deterministic test provider; this is not live Supabase/OpenAI acceptance.

The default fixture uses PostgreSQL port 5490, broker port 6390, and cache port 6380. Override `QL_DATABASE_URL` and `QL_BROKER_URL` for your local stack. Ports 8011/8012/3102 must be free. Production browser tests run with `make frontend-check`; CI also runs the live party fixture against its disposable Compose services.
