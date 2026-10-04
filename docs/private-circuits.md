# Private Circuit Studio workspace

In connected mode, `/studio` saves circuits to the authenticated account. **My Circuits** lists that account's active or archived library with pagination. Open a saved circuit on another signed-in browser using `/studio?circuit=<id>`. This is a private workspace link: another account receives `404`. Use the collaboration controls to invite other accounts to circuit or hardware parties.

## Save and recover

- Save creates an owned circuit or updates its current revision with `If-Match`. Local edits made during a save remain in the editor and are marked unsaved.
- A stale save preserves the local draft. Choose **Reload cloud version (discard edits)** or **Save as new circuit** to resolve it.
- Lost creation acknowledgments retain the idempotency key. Lost update acknowledgments are accepted only when the next cloud revision exactly matches the attempted save.
- Archive and restore require the current revision. A state change creates a revision containing the same circuit snapshot; repeating the current state makes no new revision. Archived circuits remain readable to their owner, with historical revisions and runs preserved. Restore before editing, or save a separate copy.
- **Load revision as new draft** opens an immutable historical snapshot without overwriting the current circuit.
- Selected browser drafts can be explicitly imported from My Circuits. The backend validates the circuit; browser scores, roles, results, and other demo records are never imported.

Private circuits, saved results, and tutor responses are kept out of anonymous browser persistence. Signing out or changing accounts clears the connected workspace and restores the original demo draft. Unsaved private edits live only in the current tab; save before closing it. The editor supports five qubits; larger authorized API circuits are rejected on open without truncating their saved data.

## Execute and explain

**Run saved circuit on Aer** saves first, submits the exact saved revision to the durable worker, and polls the owned run. The outcome table shows server-derived probabilities and counts with run ID, revision, shots, and backend. Local preview remains explicitly labeled; browser noise controls do not affect ideal Aer execution.

The URL retains the run and tutor session IDs so a reload can recover durable results and messages. A recovered run must belong to the selected circuit. Tutor history is filtered to the circuit revision cited in its source records. Saved-circuit explanations use the configured backend tutor provider; absent credentials produce a service error. These unpaired Studio runs do not create prediction agreement scores.

## Acceptance

After migrating the database and starting Redis and the Aer worker, run `make test-parties`. The private workspace browser test covers two browsers for one account, a second account, stale saves, a committed save with a lost response, archive/restore, real Aer execution, tutor persistence, and reload recovery. The fixture uses locally signed managed-auth-shaped JWTs and a deterministic tutor provider; live Supabase and the production tutor provider need separate release acceptance.

Hardware collaboration is connected and durable. A private hardware design library, hardware export, and server diagnostics remain B19 work.
