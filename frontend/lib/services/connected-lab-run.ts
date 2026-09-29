import type { GatePlacement } from "@/lib/lab-data"
import type { StudioCircuit } from "@/lib/studio/types"
import type { PredictionPair } from "./contracts"
import { createLearningLoopApi, LearningLoopApiError, type SavedRun } from "./learning-loop-api"
import { percentConfidenceToUnit, percentagesToPredictionVector } from "./prediction-vector"

type Api = ReturnType<typeof createLearningLoopApi>

export type ConnectedLabInput = {
  hypothesis: Record<string, number>
  confidence: number
  gates: GatePlacement[]
  shots: number
}

export type ConnectedLabKeys = {
  session: string
  prediction: string
  circuit: string
  run: string
}

export type ConnectedLabResult = { pair: PredictionPair; run: SavedRun; learningSessionId: string }
export type PendingConnectedRun = { pendingRunId: string }

export class ConnectedRunUnavailableError extends Error {
  constructor(public readonly kind: "pending" | "failed" | "missing" | "mismatch", message: string) {
    super(message)
    this.name = "ConnectedRunUnavailableError"
  }
}

export function newConnectedLabKeys(): ConnectedLabKeys {
  return { session: crypto.randomUUID(), prediction: crypto.randomUUID(), circuit: crypto.randomUUID(), run: crypto.randomUUID() }
}

const RECOVERY_PAGE_SIZE = 10
const RECOVERY_MAX_PAGES = 5
export const RECENT_COMPARISON_EMPTY_MESSAGE = "No completed Superposition comparison was found in the latest 50 sessions (up to 50 predictions each)."

/** Find a recent owned Superposition run, optionally including work still processing. */
export async function latestConnectedSuperposition(api: Api): Promise<ConnectedLabResult | null>
export async function latestConnectedSuperposition(api: Api, includePending: true): Promise<ConnectedLabResult | PendingConnectedRun | null>
export async function latestConnectedSuperposition(api: Api, includePending = false): Promise<ConnectedLabResult | PendingConnectedRun | null> {
  let sessionCursor: string | undefined
  for (let sessionPage = 0; sessionPage < RECOVERY_MAX_PAGES; sessionPage++) {
    const sessions = await api.listSessions({ lessonId: "u1-quantum-foundations", limit: RECOVERY_PAGE_SIZE, cursor: sessionCursor })
    for (const session of sessions.items) {
      let predictionCursor: string | undefined
      for (let predictionPage = 0; predictionPage < RECOVERY_MAX_PAGES; predictionPage++) {
        const predictions = await api.listPredictions(session.id, { limit: RECOVERY_PAGE_SIZE, cursor: predictionCursor })
        for (const prediction of predictions.items) {
          if (!prediction.run_id) continue
          if (includePending && prediction.pairing_status === "pending") {
            const pendingRun = await api.getRun(prediction.run_id)
            if (pendingRun.id !== prediction.run_id) {
              throw new ConnectedRunUnavailableError("mismatch", "This saved run does not match its prediction. Try another saved run.")
            }
            if (pendingRun.status === "queued" || pendingRun.status === "running") return { pendingRunId: pendingRun.id }
          }
          if (prediction.pairing_status !== "paired") continue
          const run = await api.getRun(prediction.run_id)
          if (run.status !== "succeeded") continue
          const pair = await api.getPair(prediction.id)
          if (pair.run_id !== run.id || pair.prediction_id !== prediction.id) {
            throw new ConnectedRunUnavailableError("mismatch", "This saved comparison does not match its run. Try another saved run.")
          }
          return { pair, run, learningSessionId: session.id }
        }
        if (!predictions.next_cursor) break
        if (predictions.next_cursor === predictionCursor) throw new Error("Saved prediction list did not advance. Please retry.")
        predictionCursor = predictions.next_cursor
      }
    }
    if (!sessions.next_cursor) break
    if (sessions.next_cursor === sessionCursor) throw new Error("Saved session list did not advance. Please retry.")
    sessionCursor = sessions.next_cursor
  }
  return null
}

/** Resolve one immutable owner-scoped result from its run ID, including shared URLs. */
export async function connectedSuperpositionForRun(api: Api, runId: string): Promise<ConnectedLabResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId)) {
    throw new Error("Invalid saved run ID.")
  }
  let run: SavedRun
  try {
    run = await api.getRun(runId)
  } catch (cause) {
    if (cause instanceof LearningLoopApiError && cause.status === 404) {
      throw new ConnectedRunUnavailableError("missing", "This saved run is unavailable for this account. Check the link or choose one of your own runs.")
    }
    throw cause
  }
  if (run.id.toLowerCase() !== runId.toLowerCase()) {
    throw new ConnectedRunUnavailableError("mismatch", "This saved run does not match the requested link. Try another saved run.")
  }
  if (run.status === "queued" || run.status === "running") {
    throw new ConnectedRunUnavailableError("pending", `This saved Aer run is ${run.status}. Check again for its comparison.`)
  }
  if (run.status !== "succeeded") {
    const status = run.status === "timed_out" ? "timed out" : run.status === "unknown" ? "unavailable" : run.status
    throw new ConnectedRunUnavailableError("failed", `This saved Aer run ${status}. No prediction comparison was recorded.`)
  }
  if (!run.prediction_id) {
    throw new ConnectedRunUnavailableError("missing", "This saved run has no paired prediction comparison.")
  }
  const prediction = await api.getPrediction(run.prediction_id)
  if (prediction.lesson_id !== "u1-quantum-foundations") throw new Error("This run belongs to another lesson.")
  const pair = await api.getPair(run.prediction_id)
  if (pair.run_id !== run.id || pair.prediction_id !== run.prediction_id) {
    throw new ConnectedRunUnavailableError("mismatch", "This saved comparison does not match the requested run. Try another saved run.")
  }
  return { pair, run, learningSessionId: prediction.learning_session_id }
}

export function connectedCircuitIsStale(gates: GatePlacement[], run: SavedRun): boolean {
  const current = gates.map(({ id, gate, step, qubit, target }) => ({ id, type: gate, step, qubit, ...(target === undefined ? {} : { target }) }))
  const saved = run.circuit_snapshot.gates
  const order = (a: { step: number; qubit: number; id: string }, b: { step: number; qubit: number; id: string }) => a.step - b.step || a.qubit - b.qubit || a.id.localeCompare(b.id)
  return run.circuit_snapshot.qubits !== 2 || JSON.stringify([...current].sort(order)) !== JSON.stringify([...saved].sort(order))
}

function circuitFromGates(gates: GatePlacement[]): StudioCircuit {
  return {
    name: "Superposition lab",
    qubits: 2,
    gates: gates.map(({ id, gate, step, qubit, target }) => ({ id, type: gate, step, qubit, ...(target === undefined ? {} : { target }) })),
  }
}

async function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError")
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve() }, ms)
    const abort = () => { clearTimeout(timer); reject(new DOMException("Operation cancelled", "AbortError")) }
    signal?.addEventListener("abort", abort, { once: true })
  })
}

function ensureActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError")
}

/** One retryable operation. Reusing keys and the same input never creates a second run. */
export async function runConnectedSuperposition(
  api: Api,
  input: ConnectedLabInput,
  keys: ConnectedLabKeys,
  onStatus: (status: string) => void,
  signal?: AbortSignal,
): Promise<ConnectedLabResult> {
  if (!Number.isInteger(input.shots) || input.shots < 1 || input.shots > 8192) throw new Error("Choose 1 to 8,192 shots.")
  const lessonId = "u1-quantum-foundations"
  const labels = ["00", "01", "10", "11"]
  const vector = percentagesToPredictionVector(input.hypothesis, labels)
  const confidence = percentConfidenceToUnit(input.confidence)
  const circuit = circuitFromGates(input.gates)

  onStatus("Checking the current lesson version…")
  const unit = await api.getCurriculumUnit("u1")
  if (!unit.lessons.some((lesson) => lesson.id === lessonId)) throw new Error("The superposition lesson is unavailable.")
  ensureActive(signal)

  onStatus("Saving your learning session…")
  const session = await api.createSession({ lesson_id: lessonId, lesson_version: unit.content_version }, keys.session)
  ensureActive(signal)
  onStatus("Locking your prediction…")
  const prediction = await api.lockPrediction(session.id, {
    schema_version: 1,
    lesson_id: lessonId,
    lesson_version: unit.content_version,
    learning_session_id: session.id,
    prediction_vector: vector,
    basis_labels: labels,
    measurement_qubits: [1, 0],
    comparison_basis: "sampled_frequency",
    confidence,
  }, keys.prediction)
  ensureActive(signal)
  onStatus("Saving the exact circuit…")
  const saved = await api.createCircuit(circuit, keys.circuit)
  ensureActive(signal)
  onStatus("Submitting the Aer run…")
  const accepted = await api.submitRun({
    circuit_id: saved.id,
    circuit_revision: saved.revision,
    backend: "qiskit_aer",
    shots: input.shots,
    prediction_id: prediction.id,
  }, keys.run)

  for (let attempt = 0; attempt < 60; attempt++) {
    ensureActive(signal)
    const run = await api.getRun(accepted.resource_id, signal)
    if (run.status === "succeeded") {
      onStatus("Loading the verified comparison…")
      const pair = await api.getPair(prediction.id)
      if (pair.run_id !== run.id || pair.prediction_id !== prediction.id) throw new Error("The saved comparison does not match this run.")
      return { pair, run, learningSessionId: session.id }
    }
    if (["failed", "cancelled", "timed_out", "unknown"].includes(run.status)) {
      throw new LearningLoopApiError(409, run.error_code ?? "run_failed", "The Aer run did not complete. Review the circuit and retry.")
    }
    onStatus(`Aer run ${run.status}…`)
    await pause(500, signal)
  }
  throw new LearningLoopApiError(408, "run_pending", "The run is still processing. Retry to check the same saved run.")
}
