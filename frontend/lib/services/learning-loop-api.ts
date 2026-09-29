import type { StudioCircuit } from "@/lib/studio/types"
import type { PredictionPair, PredictionSubmission } from "./contracts"
import type { LearnerUnit } from "./contracts"

export type Page<T> = { items: T[]; next_cursor: string | null }
export type LearningSession = {
  id: string
  lesson_id: string
  lesson_version: number
  created_at: string
}
export type LockedPrediction = PredictionSubmission & {
  id: string
  locked_at: string
  pairing_status: "unpaired" | "pending" | "paired" | "failed"
  run_id: string | null
}
export type CircuitRecord = {
  id: string
  revision: number
  snapshot: StudioCircuit & { schema_version: 1 }
  checksum_sha256: string
  created_at: string
  updated_at: string
}
export type RunAccepted = {
  job_id: string
  status: "queued"
  status_url: string
  resource_id: string
}
export type SavedRun = {
  id: string
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out" | "unknown"
  error_code: string | null
  circuit_id: string
  circuit_revision: number
  circuit_snapshot: CircuitRecord["snapshot"]
  checksum_sha256: string
  backend: string
  shots: number
  seed: number | null
  prediction_id: string | null
  result: Record<string, unknown> | null
  created_at: string
}
export type TutorRequestBody = {
  action: "explain" | "changed" | "unexpected" | "optimize" | "generate" | "plan"
  stage: "learn" | "predict" | "build" | "run" | "observe" | "discuss"
  prompt: string
  run_id?: string
  circuit_id?: string
  circuit_revision?: number
}
export type SavedTutorMessage = TutorRequestBody & {
  id: string
  learning_session_id: string
  status: "pending" | "completed" | "failed"
  role: "pedagogical_guide" | "circuit_debugger" | "analytics_planner"
  prompt_version: string
  model: string
  source_record_ids: string[]
  response_text: string | null
  recommendation: { candidate_id: string; label: string; href: string; reason: string } | null
  provider_called: boolean | null
  error_code: string | null
  created_at: string
  completed_at: string | null
}

export class LearningLoopApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message)
    this.name = "LearningLoopApiError"
  }
}

/** The token provider must return a current managed-auth access token for each request. */
export function createLearningLoopApi(
  baseUrl: string,
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  const root = baseUrl.replace(/\/$/, "")
  if (!root.endsWith("/api/v1")) throw new Error("Learning loop API base must end in /api/v1")

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getAccessToken()
    if (!token) throw new LearningLoopApiError(401, "authentication_required", "Sign in to continue.")
    const response = await fetcher(`${root}${path}`, {
      ...init,
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const error = payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { code?: unknown; message?: unknown } }).error
        : undefined
      const code = typeof error?.code === "string" ? error.code : "service_unavailable"
      const message = typeof error?.message === "string" ? error.message : "The service request failed. Please retry."
      throw new LearningLoopApiError(response.status, code, message)
    }
    return response.json() as Promise<T>
  }

  function pagePath(path: string, options: { limit?: number; cursor?: string; lessonId?: string } = {}) {
    const query = new URLSearchParams()
    if (options.limit !== undefined) query.set("limit", String(options.limit))
    if (options.cursor) query.set("cursor", options.cursor)
    if (options.lessonId) query.set("lesson_id", options.lessonId)
    return query.size ? `${path}?${query}` : path
  }

  function post<T>(path: string, body: unknown, key: string): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    })
  }

  const sessionPath = (id: string) => `/learning-sessions/${encodeURIComponent(id)}`

  return {
    getCurriculumUnit: (id: string) => request<LearnerUnit>(`/curriculum/units/${encodeURIComponent(id)}`),
    listSessions: (options?: { lessonId?: string; limit?: number; cursor?: string }) =>
      request<Page<LearningSession>>(pagePath("/learning-sessions", options)),
    createSession: (body: { lesson_id: string; lesson_version: number }, key: string) =>
      post<LearningSession>("/learning-sessions", body, key),
    getSession: (id: string) => request<LearningSession>(sessionPath(id)),
    listPredictions: (sessionId: string, options?: { limit?: number; cursor?: string }) =>
      request<Page<LockedPrediction>>(pagePath(`${sessionPath(sessionId)}/predictions`, options)),
    lockPrediction: (sessionId: string, body: PredictionSubmission, key: string) =>
      post<LockedPrediction>(`${sessionPath(sessionId)}/predictions`, body, key),
    getPrediction: (id: string) => request<LockedPrediction>(`/predictions/${encodeURIComponent(id)}`),
    getPair: (predictionId: string) => request<PredictionPair>(`/predictions/${encodeURIComponent(predictionId)}/pair`),
    createCircuit: (body: StudioCircuit, key: string) => post<CircuitRecord>("/circuits", body, key),
    getCircuit: (id: string) => request<CircuitRecord>(`/circuits/${encodeURIComponent(id)}`),
    updateCircuit: (id: string, body: StudioCircuit, revision: number) =>
      request<CircuitRecord>(`/circuits/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "If-Match": `"rev-${revision}"` },
        body: JSON.stringify(body),
      }),
    submitRun: (body: { circuit_id: string; circuit_revision: number; backend: "qiskit_aer"; shots: number; seed?: number; prediction_id?: string }, key: string) =>
      post<RunAccepted>("/experiments/runs", body, key),
    getRun: (id: string, signal?: AbortSignal) => request<SavedRun>(`/experiments/runs/${encodeURIComponent(id)}`, { signal }),
    listTutorMessages: (sessionId: string) => request<SavedTutorMessage[]>(`${sessionPath(sessionId)}/tutor/messages`),
    sendTutorMessage: (sessionId: string, body: TutorRequestBody, key: string) =>
      post<SavedTutorMessage>(`${sessionPath(sessionId)}/tutor/messages`, body, key),
  }
}
