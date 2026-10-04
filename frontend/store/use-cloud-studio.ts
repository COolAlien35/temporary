import { create } from "zustand"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { LearningLoopApiError, type CircuitRecord, type CircuitSummary, type SavedRun, type SavedTutorMessage } from "@/lib/services/learning-loop-api"
import type { StudioCircuit } from "@/lib/studio/types"
import { useStudio, MAX_QUBITS } from "./use-studio"
import { useSession } from "./use-session"

export const draftKey = (draft: StudioCircuit) => JSON.stringify({ name: draft.name, qubits: draft.qubits, gates: [...draft.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit || a.id.localeCompare(b.id)).map((gate) => ({ id: gate.id, type: gate.type, step: gate.step, qubit: gate.qubit, target: gate.target, control2: gate.control2, theta: gate.theta })) })
export const studioUrl = (circuit?: string, run?: string, tutor?: string) => {
  const query = new URLSearchParams()
  if (circuit) query.set("circuit", circuit)
  if (run) query.set("run", run)
  if (tutor) query.set("tutor", tutor)
  window.history.replaceState(window.history.state, "", `/studio${query.size ? `?${query}` : ""}`)
}
let generation = 0
let libraryGeneration = 0
let controller: AbortController | null = null
let createAttempt: { body: StudioCircuit; key: string } | null = null
let runAttempt: { body: { circuit_id: string; circuit_revision: number; backend: "qiskit_aer"; shots: number }; key: string } | null = null
let tutorAttempt: { key: string; prompt: string; circuit_id: string; circuit_revision: number } | null = null

interface CloudStudio {
  owner: string | null
  record: CircuitRecord | null
  items: CircuitSummary[]
  cursor: string | null
  archived: boolean
  loading: boolean
  busy: boolean
  running: boolean
  asking: boolean
  error: string
  conflict: boolean
  run: SavedRun | null
  tutorSession: string | null
  messages: SavedTutorMessage[]
  scope: (owner: string | null) => void
  list: (archived?: boolean, more?: boolean) => Promise<void>
  open: (id: string, revision?: number) => Promise<void>
  save: (copy?: boolean) => Promise<CircuitRecord | null>
  archive: (item: CircuitSummary, archived: boolean) => Promise<void>
  execute: () => Promise<void>
  recoverRun: (id: string, circuitId: string) => Promise<void>
  explain: () => Promise<void>
  recoverTutor: (id: string) => Promise<void>
  newDraft: (draft?: StudioCircuit) => void
}
const initial = { record: null, items: [], cursor: null, archived: false, loading: false, busy: false, running: false, asking: false, error: "", conflict: false, run: null, tutorSession: null, messages: [] }

export const useCloudStudio = create<CloudStudio>((set, get) => {
  const scope = () => ({ owner: get().owner, generation })
  const active = (request: ReturnType<typeof scope>) => Boolean(request.owner && request.owner === get().owner && request.owner === useSession.getState().user?.id && request.generation === generation && !useStudio.getState().partyActive)
  const fail = (cause: unknown, request: ReturnType<typeof scope>) => { if (active(request)) set({ error: cause instanceof Error ? cause.message : "The service is unavailable. Retry your request." }) }
  const load = (record: CircuitRecord) => {
    if (record.snapshot.qubits > MAX_QUBITS) throw new Error(`This circuit has ${record.snapshot.qubits} qubits. The Studio editor supports ${MAX_QUBITS}; the saved circuit is unchanged.`)
    useStudio.getState().loadCircuit(record.snapshot)
    useStudio.setState({ past: [], future: [], clipboard: [], stepIndex: null })
    set({ record, conflict: false, run: null, tutorSession: null, messages: [], error: "" })
    studioUrl(record.id)
  }
  const poll = async (id: string, circuitId: string, request: ReturnType<typeof scope>) => {
    controller?.abort()
    const signal = (controller = new AbortController()).signal
    set({ running: true, error: "" })
    try {
      const deadline = Date.now() + 90000
      while (active(request) && !signal.aborted) {
        const run = await connectedLearningLoopApi().getRun(id, signal)
        if (!active(request) || signal.aborted) return
        if (run.id !== id || run.circuit_id !== circuitId) throw new Error("The saved run does not belong to this circuit.")
        set({ run })
        if (!["queued", "running"].includes(run.status) || Date.now() > deadline) break
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (cause) { if (!signal.aborted) fail(cause, request) }
    finally { if (active(request) && !signal.aborted) set({ running: false }) }
  }
  return {
    ...initial, owner: null,
    scope: (owner) => { generation++; controller?.abort(); createAttempt = null; runAttempt = null; tutorAttempt = null; set({ ...initial, owner }) },
    newDraft: (draft = { name: "Untitled circuit", qubits: 2, gates: [] }) => {
      generation++; controller?.abort(); createAttempt = null; runAttempt = null; tutorAttempt = null
      set({ record: null, run: null, messages: [], tutorSession: null, error: "", conflict: false, running: false, asking: false, loading: false })
      useStudio.getState().loadCircuit(draft)
      useStudio.setState({ past: [], future: [], clipboard: [] })
      studioUrl()
    },
    list: async (archived = get().archived, more = false) => {
      const request = scope()
      if (!active(request)) return
      const cursor = more ? get().cursor : null
      const listGeneration = ++libraryGeneration
      set({ loading: true, archived, error: "", ...(more ? {} : { items: [], cursor: null }) })
      try {
        const page = await connectedLearningLoopApi().listCircuits({ archived, limit: 10, ...(cursor ? { cursor } : {}) })
        if (active(request) && listGeneration === libraryGeneration && get().archived === archived) set({ items: more ? [...get().items, ...page.items.filter((item) => !get().items.some((old) => old.id === item.id))] : page.items, cursor: page.next_cursor })
      } catch (cause) { fail(cause, request) }
      finally { if (active(request) && listGeneration === libraryGeneration) set({ loading: false }) }
    },
    open: async (id, revision) => {
      if (!active(scope()) || get().busy) return
      generation++; controller?.abort(); createAttempt = null; runAttempt = null; tutorAttempt = null
      const request = scope()
      set({ running: false, asking: false, loading: false })
      set({ busy: true, error: "" })
      try {
        const api = connectedLearningLoopApi()
        const record = revision ? await api.getCircuitRevision(id, revision) : await api.getCircuit(id)
        if (active(request)) {
          load(record)
          if (revision) { studioUrl(); set({ record: null, error: `Loaded revision ${revision} as a new draft. Save as a new circuit to preserve history.` }) }
        }
      } catch (cause) { fail(cause, request) }
      finally { if (active(request)) set({ busy: false }) }
    },
    save: async (copy = false) => {
      const request = scope()
      if (!active(request) || get().busy) return null
      if (get().conflict && !copy) { set({ error: "Reload the cloud version or save your edits as a new circuit to resolve this conflict." }); return null }
      const body = structuredClone(useStudio.getState().circuit)
      const previous = copy ? null : get().record
      if (previous?.archived) { set({ error: "Restore this circuit before saving edits, or save as a new circuit." }); return null }
      set({ busy: true, error: "", conflict: false })
      try {
        const api = connectedLearningLoopApi()
        let saved: CircuitRecord
        if (previous) {
          try { saved = await api.updateCircuit(previous.id, body, previous.revision) }
          catch (cause) {
            if (!(cause instanceof LearningLoopApiError) || cause.status !== 412 || !active(request)) throw cause
            const current = await api.getCircuit(previous.id)
            // A lost acknowledgment can be recovered only when the next revision equals this exact save.
            if (current.revision === previous.revision + 1 && !current.archived && draftKey(current.snapshot) === draftKey(body)) saved = current
            else { if (active(request)) set({ conflict: true }); throw cause }
          }
        } else {
          if (!createAttempt || draftKey(createAttempt.body) !== draftKey(body)) createAttempt = { body, key: crypto.randomUUID() }
          saved = await api.createCircuit(createAttempt.body, createAttempt.key)
        }
        if (!active(request)) return null
        createAttempt = null
        if (!previous && draftKey(saved.snapshot) !== draftKey(body)) {
          set({ record: saved, conflict: true, error: "The recovered save has newer cloud edits. Reload the cloud version or save your edits as a new circuit." })
          return null
        }
        const differentCircuit = get().record?.id !== saved.id
        set({ record: saved, conflict: false, ...(differentCircuit ? { run: null, tutorSession: null, messages: [] } : {}) })
        studioUrl(saved.id, get().run?.circuit_id === saved.id ? get().run?.id : undefined, get().tutorSession ?? undefined)
        void get().list()
        return saved
      } catch (cause) { fail(cause, request); return null }
      finally { if (active(request)) set({ busy: false }) }
    },
    archive: async (item, archived) => {
      const request = scope()
      if (!active(request) || get().busy) return
      set({ busy: true, error: "" })
      try {
        const record = await connectedLearningLoopApi().archiveCircuit(item.id, archived, item.revision)
        if (active(request)) { if (get().record?.id === record.id) set({ record }); await get().list() }
      } catch (cause) { fail(cause, request) }
      finally { if (active(request)) set({ busy: false }) }
    },
    execute: async () => {
      const request = scope()
      if (!active(request) || get().running || get().busy) return
      try {
        if (!runAttempt) {
          const saved = await get().save()
          if (!saved || !active(request)) return
          runAttempt = { key: crypto.randomUUID(), body: { circuit_id: saved.id, circuit_revision: saved.revision, backend: "qiskit_aer", shots: useStudio.getState().shots } }
        }
        set({ running: true, error: "", run: null })
        const attempt = runAttempt
        const accepted = await connectedLearningLoopApi().submitRun(attempt.body, attempt.key)
        if (!active(request)) return
        runAttempt = null
        studioUrl(attempt.body.circuit_id, accepted.resource_id, get().tutorSession ?? undefined)
        await poll(accepted.resource_id, attempt.body.circuit_id, request)
      } catch (cause) { fail(cause, request); if (active(request)) set({ running: false }) }
    },
    recoverRun: async (id, circuitId) => { const request = scope(); if (active(request)) { set({ run: null }); await poll(id, circuitId, request) } },
    explain: async () => {
      const request = scope()
      const record = get().record
      if (!active(request) || !record || get().asking) return
      const revision = get().run?.circuit_id === record.id ? get().run!.circuit_revision : record.revision
      set({ asking: true, error: "" })
      try {
        const api = connectedLearningLoopApi()
        let sessionId = get().tutorSession
        if (!sessionId) {
          const unit = await api.getCurriculumUnit("u1")
          if (!active(request)) return
          const session = await api.createSession({ lesson_id: "u1-quantum-foundations", lesson_version: unit.content_version }, crypto.randomUUID())
          if (!active(request)) return
          sessionId = session.id
          set({ tutorSession: sessionId })
        }
        if (!tutorAttempt || tutorAttempt.circuit_id !== record.id || tutorAttempt.circuit_revision !== revision) tutorAttempt = { key: crypto.randomUUID(), circuit_id: record.id, circuit_revision: revision, prompt: "Explain this saved circuit revision and suggest one experiment to try next." }
        const attempt = tutorAttempt
        const message = await api.sendTutorMessage(sessionId, { action: "explain", stage: "build", prompt: attempt.prompt, circuit_id: attempt.circuit_id, circuit_revision: attempt.circuit_revision }, attempt.key)
        if (!active(request)) return
        tutorAttempt = null
        set({ messages: [...get().messages.filter((old) => old.id !== message.id), message] })
        studioUrl(record.id, get().run?.id, sessionId)
      } catch (cause) { fail(cause, request) }
      finally { if (active(request)) set({ asking: false }) }
    },
    recoverTutor: async (id) => {
      const request = scope()
      const circuitId = get().record?.id
      if (!active(request) || !circuitId) return
      try {
        const messages = await connectedLearningLoopApi().listTutorMessages(id)
        if (active(request) && get().record?.id === circuitId) set({ tutorSession: id, messages: messages.filter((message) => message.source_record_ids.includes(`${circuitId}:${get().run?.circuit_id === circuitId ? get().run!.circuit_revision : get().record!.revision}`)).reverse() })
      } catch (cause) { fail(cause, request) }
    },
  }
})
