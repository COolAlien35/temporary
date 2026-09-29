import { expect, test } from "@playwright/test"
import { connectedCircuitIsStale, connectedSuperpositionForRun, latestConnectedSuperposition, runConnectedSuperposition, type ConnectedLabKeys } from "../lib/services/connected-lab-run"
import { createLearningLoopApi } from "../lib/services/learning-loop-api"

const keys: ConnectedLabKeys = { session: "session-key", prediction: "prediction-key", circuit: "circuit-key", run: "run-key" }
const input = {
  hypothesis: { "00": 50, "01": 50, "10": 0, "11": 0 },
  confidence: 80,
  gates: [{ id: "h-q0", gate: "H" as const, qubit: 0, step: 0 }],
  shots: 128,
}

test("connected superposition saves prediction before the exact circuit run and reads the server pair", async () => {
  const calls: Array<{ path: string; init: RequestInit }> = []
  let polls = 0
  const fetcher = (async (url: string | URL | Request, init: RequestInit = {}) => {
    const path = new URL(String(url)).pathname
    calls.push({ path, init })
    if (path.endsWith("/curriculum/units/u1")) return Response.json({ content_version: 3, lessons: [{ id: "u1-quantum-foundations" }] })
    if (path.endsWith("/learning-sessions")) return Response.json({ id: "session-1", lesson_id: "u1-quantum-foundations", lesson_version: 3 })
    if (path.endsWith("/learning-sessions/session-1/predictions")) return Response.json({ id: "prediction-1" })
    if (path.endsWith("/circuits")) return Response.json({ id: "circuit-1", revision: 1 })
    if (path.endsWith("/experiments/runs") && init.method === "POST") return Response.json({ resource_id: "run-1", status: "queued" })
    if (path.endsWith("/experiments/runs/run-1")) return Response.json({ id: "run-1", status: ++polls === 1 ? "queued" : "succeeded" })
    if (path.endsWith("/predictions/prediction-1/pair")) return Response.json({
      run_id: "run-1", prediction_id: "prediction-1", prediction_vector: [0.5, 0.5, 0, 0],
      simulated_vector: [0.48, 0.52, 0, 0], basis_labels: ["00", "01", "10", "11"],
      comparison_basis: "sampled_frequency", circuit_revision: 1, shots: 128, prediction_match: 0.98,
    })
    return new Response(null, { status: 404 })
  }) as typeof fetch
  const api = createLearningLoopApi("https://api.example.test/api/v1", async () => "current-token", fetcher)
  const statuses: string[] = []
  const result = await runConnectedSuperposition(api, input, keys, (message) => statuses.push(message))

  expect(result.pair.prediction_match).toBe(0.98)
  expect(result.learningSessionId).toBe("session-1")
  expect(calls.map((item) => item.path)).toEqual([
    "/api/v1/curriculum/units/u1", "/api/v1/learning-sessions", "/api/v1/learning-sessions/session-1/predictions",
    "/api/v1/circuits", "/api/v1/experiments/runs", "/api/v1/experiments/runs/run-1",
    "/api/v1/experiments/runs/run-1", "/api/v1/predictions/prediction-1/pair",
  ])
  expect(JSON.parse(String(calls[2].init.body))).toMatchObject({
    lesson_version: 3, prediction_vector: [0.5, 0.5, 0, 0], measurement_qubits: [1, 0], confidence: 0.8,
  })
  expect(JSON.parse(String(calls[3].init.body))).toEqual({ name: "Superposition lab", qubits: 2, gates: [{ id: "h-q0", type: "H", step: 0, qubit: 0 }] })
  expect(JSON.parse(String(calls[4].init.body))).toMatchObject({ circuit_id: "circuit-1", circuit_revision: 1, prediction_id: "prediction-1", shots: 128 })
  expect(calls.slice(1, 5).map((item) => (item.init.headers as Record<string, string>)["Idempotency-Key"])).toEqual([keys.session, keys.prediction, keys.circuit, keys.run])
  expect(calls.every((item) => (item.init.headers as Record<string, string>).Authorization === "Bearer current-token")).toBe(true)
  expect(statuses).toContain("Loading the verified comparison…")
})

test("invalid prediction is rejected before any connected write", async () => {
  const fetcher = (async () => { throw new Error("Unexpected request") }) as typeof fetch
  const api = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", fetcher)
  await expect(runConnectedSuperposition(api, { ...input, hypothesis: { ...input.hypothesis, "00": 60 } }, keys, () => {})).rejects.toThrow("sum to 100")
})

test("recent connected comparison is recovered through owner-scoped session and prediction lists", async () => {
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname
    calls.push(path)
    if (path.endsWith("/learning-sessions")) return Response.json({ items: [{ id: "session-latest" }], next_cursor: null })
    if (path.endsWith("/learning-sessions/session-latest/predictions")) return Response.json({ items: [{ id: "prediction-latest", pairing_status: "paired", run_id: "run-latest" }], next_cursor: null })
    if (path.endsWith("/experiments/runs/run-latest")) return Response.json({ id: "run-latest", status: "succeeded" })
    if (path.endsWith("/predictions/prediction-latest/pair")) return Response.json({ prediction_id: "prediction-latest", run_id: "run-latest", prediction_match: 0.75 })
    return new Response(null, { status: 404 })
  }) as typeof fetch
  const api = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", fetcher)
  const recent = await latestConnectedSuperposition(api)
  expect(recent?.pair.prediction_match).toBe(0.75)
  expect(recent?.learningSessionId).toBe("session-latest")
  expect(calls).toEqual([
    "/api/v1/learning-sessions", "/api/v1/learning-sessions/session-latest/predictions",
    "/api/v1/experiments/runs/run-latest", "/api/v1/predictions/prediction-latest/pair",
  ])
})

test("recent comparison search follows session and prediction cursors", async () => {
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request) => {
    const request = new URL(String(url))
    calls.push(`${request.pathname}${request.search}`)
    if (request.pathname.endsWith("/learning-sessions")) {
      return Response.json(request.searchParams.get("cursor")
        ? { items: [{ id: "older-session" }], next_cursor: null }
        : { items: [{ id: "newer-session" }], next_cursor: "newer-session" })
    }
    if (request.pathname.endsWith("/learning-sessions/newer-session/predictions")) {
      return Response.json({ items: [{ id: "newer-unpaired", pairing_status: "unpaired", run_id: null }], next_cursor: null })
    }
    if (request.pathname.endsWith("/learning-sessions/older-session/predictions")) {
      return Response.json(request.searchParams.get("cursor")
        ? { items: [{ id: "older-paired", pairing_status: "paired", run_id: "older-run" }], next_cursor: null }
        : { items: [{ id: "older-unpaired", pairing_status: "unpaired", run_id: null }], next_cursor: "older-unpaired" })
    }
    if (request.pathname.endsWith("/experiments/runs/older-run")) return Response.json({ id: "older-run", status: "succeeded" })
    if (request.pathname.endsWith("/predictions/older-paired/pair")) return Response.json({ prediction_id: "older-paired", run_id: "older-run", prediction_match: 0.9 })
    return new Response(null, { status: 404 })
  }) as typeof fetch
  const api = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", fetcher)
  const saved = await latestConnectedSuperposition(api)
  expect(saved?.learningSessionId).toBe("older-session")
  expect(saved?.pair.prediction_match).toBe(0.9)
  expect(calls).toEqual([
    "/api/v1/learning-sessions?limit=10&lesson_id=u1-quantum-foundations",
    "/api/v1/learning-sessions/newer-session/predictions?limit=10",
    "/api/v1/learning-sessions?limit=10&cursor=newer-session&lesson_id=u1-quantum-foundations",
    "/api/v1/learning-sessions/older-session/predictions?limit=10",
    "/api/v1/learning-sessions/older-session/predictions?limit=10&cursor=older-unpaired",
    "/api/v1/experiments/runs/older-run",
    "/api/v1/predictions/older-paired/pair",
  ])
})

test("exact run lookup rejects mismatched pairs and stale editor gates", async () => {
  const runId = "cc5c8e0f-b7c4-495f-83a8-52ed54e430bd"
  const predictionId = "c7b86b70-f6d3-4b84-a772-183015075eaa"
  const fetcher = (async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith(`/experiments/runs/${runId}`)) return Response.json({
      id: runId, status: "succeeded", prediction_id: predictionId,
      circuit_snapshot: { schema_version: 1, name: "Superposition lab", qubits: 2, gates: [{ id: "h-q0", type: "H", step: 0, qubit: 0 }] },
    })
    if (path.endsWith(`/predictions/${predictionId}`)) return Response.json({ id: predictionId, lesson_id: "u1-quantum-foundations", learning_session_id: "session-owned" })
    if (path.endsWith(`/predictions/${predictionId}/pair`)) return Response.json({ run_id: runId, prediction_id: predictionId })
    return new Response(null, { status: 404 })
  }) as typeof fetch
  const api = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", fetcher)
  const saved = await connectedSuperpositionForRun(api, runId)
  expect(saved.learningSessionId).toBe("session-owned")
  expect(connectedCircuitIsStale(input.gates, saved.run)).toBe(false)
  expect(connectedCircuitIsStale([], saved.run)).toBe(true)
  await expect(connectedSuperpositionForRun(api, "not-a-uuid")).rejects.toThrow("Invalid saved run ID")

  const mismatch = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", (async (url: string | URL | Request) => {
    if (String(url).includes("/pair")) return Response.json({ run_id: "another-run", prediction_id: predictionId })
    return fetcher(url)
  }) as typeof fetch)
  await expect(connectedSuperpositionForRun(mismatch, runId)).rejects.toThrow("does not match the requested run")

  const wrongRun = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", (async (url: string | URL | Request) => {
    if (String(url).endsWith(`/experiments/runs/${runId}`)) return Response.json({ id: "another-run", status: "succeeded", prediction_id: predictionId })
    return fetcher(url)
  }) as typeof fetch)
  await expect(connectedSuperpositionForRun(wrongRun, runId)).rejects.toThrow("does not match the requested link")

  const wrongLesson = createLearningLoopApi("https://api.example.test/api/v1", async () => "token", (async (url: string | URL | Request) => {
    if (String(url).endsWith(`/predictions/${predictionId}`)) return Response.json({ id: predictionId, lesson_id: "u3-bell-states" })
    return fetcher(url)
  }) as typeof fetch)
  await expect(connectedSuperpositionForRun(wrongLesson, runId)).rejects.toThrow("another lesson")
})
