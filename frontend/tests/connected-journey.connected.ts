import { expect, test } from "@playwright/test"

const ids = {
  user: "77777777-7777-4777-8777-777777777777",
  currentSession: "33333333-3333-4333-8333-333333333333",
  currentPrediction: "22222222-2222-4222-8222-222222222222",
  currentRun: "11111111-1111-4111-8111-111111111111",
  olderSession: "66666666-6666-4666-8666-666666666666",
  olderPrediction: "55555555-5555-4555-8555-555555555555",
  olderRun: "44444444-4444-4444-8444-444444444444",
  tutorMessage: "88888888-8888-4888-8888-888888888888",
}

test("connected learner reopens a prior Aer round and reloads its run-bound tutor reply", async ({ page }) => {
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ids.user, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id: ids.user, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const savedMessages: Record<string, unknown>[] = []
  const tutorPosts: Record<string, unknown>[] = []
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
    "Content-Type": "application/json",
  }

  await page.route("https://provider.example.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (path === "/auth/v1/token") return route.fulfill({ headers: cors, json: { access_token: token, refresh_token: "test-refresh-token", expires_in: 3600, token_type: "bearer", user } })
    if (path === "/auth/v1/user") return route.fulfill({ headers: cors, json: user })
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })

  await page.route("https://api.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (request.headers().authorization !== `Bearer ${token}`) return route.fulfill({ status: 401, headers: cors, json: { error: { code: "authentication_required", message: "Sign in" } } })
    if (path === "/api/v1/me") return route.fulfill({ headers: cors, json: { id: ids.user, name: "Connected Learner", email: user.email, role: "learner" } })
    const older = path.includes(ids.olderRun) || path.includes(ids.olderPrediction) || path.includes(ids.olderSession)
    const runId = older ? ids.olderRun : ids.currentRun
    const predictionId = older ? ids.olderPrediction : ids.currentPrediction
    const sessionId = older ? ids.olderSession : ids.currentSession
    if (path === `/api/v1/experiments/runs/${runId}`) return route.fulfill({ headers: cors, json: {
      id: runId, status: "succeeded", prediction_id: predictionId, backend: "qiskit_aer", shots: 1024,
      circuit_revision: 1, circuit_snapshot: { schema_version: 1, name: "Superposition lab", qubits: 2, gates: [{ id: "h-q0", type: "H", step: 0, qubit: 0 }] },
    } })
    if (path === `/api/v1/predictions/${predictionId}`) return route.fulfill({ headers: cors, json: { id: predictionId, lesson_id: "u1-quantum-foundations", learning_session_id: sessionId } })
    if (path === `/api/v1/predictions/${predictionId}/pair`) return route.fulfill({ headers: cors, json: {
      schema_version: 1, prediction_id: predictionId, run_id: runId, prediction_vector: [0.5, 0.5, 0, 0],
      simulated_vector: older ? [0.75, 0.25, 0, 0] : [0.48, 0.52, 0, 0], basis_labels: ["00", "01", "10", "11"],
      measurement_qubits: [1, 0], comparison_basis: "sampled_frequency", metric_version: "tvd-v1",
      prediction_match: older ? 0.75 : 0.98, backend: "qiskit_aer", shots: 1024, circuit_revision: 1,
    } })
    if (path === `/api/v1/learning-sessions/${sessionId}/agreement-history`) return route.fulfill({ headers: cors, json: {
      lesson_id: "u1-quantum-foundations", lesson_version: 1, learning_session_id: sessionId, scanned_count: 2,
      older_records_not_scanned: false, unavailable_sources: [], items: [
        { learning_session_id: ids.currentSession, prediction_id: ids.currentPrediction, run_id: ids.currentRun, locked_at: "2026-09-29T12:00:00Z", comparison_basis: "sampled_frequency", metric_version: "tvd-v1", prediction_match: 0.98, confidence: 0.8, backend: "qiskit_aer", shots: 1024, seed: null, circuit_revision: 1, largest_deltas: [] },
        { learning_session_id: ids.olderSession, prediction_id: ids.olderPrediction, run_id: ids.olderRun, locked_at: "2026-09-28T12:00:00Z", comparison_basis: "sampled_frequency", metric_version: "tvd-v1", prediction_match: 0.75, confidence: 0.8, backend: "qiskit_aer", shots: 1024, seed: null, circuit_revision: 1, largest_deltas: [] },
      ],
    } })
    if (path === `/api/v1/learning-sessions/${sessionId}/tutor/messages`) {
      if (request.method() === "GET") return route.fulfill({ headers: cors, json: savedMessages.filter((message) => message.learning_session_id === sessionId).reverse() })
      const body = request.postDataJSON() as Record<string, unknown>
      tutorPosts.push(body)
      const message = { ...body, id: ids.tutorMessage, learning_session_id: sessionId, status: "completed", role: "circuit_debugger", prompt_version: "debug-v1", model: "test-tutor", source_record_ids: [sessionId, runId, predictionId], response_text: "The 00 outcome increased in this saved run.", recommendation: null, provider_called: true, error_code: null, created_at: "2026-09-29T12:01:00Z", completed_at: "2026-09-29T12:01:01Z" }
      savedMessages.push(message)
      return route.fulfill({ headers: cors, json: message })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent(`/lab/superposition?stage=5&run=${ids.currentRun}`)}`)
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "Prediction vs. Actual" })).toBeVisible()
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 98.0 percent.")).toBeVisible()
  await expect(page.getByRole("region", { name: "Recent saved Superposition rounds" }).getByRole("button", { name: /75\.0% agreement · Open/ })).toBeVisible()
  await page.getByRole("button", { name: /75\.0% agreement · Open/ }).click()
  await expect(page.getByText(`Run ID: ${ids.olderRun}`)).toBeVisible()
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 75.0 percent.")).toBeVisible()
  await page.getByRole("button", { name: "Discuss this run with Lab Partner →" }).click()
  await page.getByRole("button", { name: "What changed?" }).click()
  await expect(page.getByText("The 00 outcome increased in this saved run.")).toBeVisible()
  expect(tutorPosts).toHaveLength(1)
  expect(tutorPosts[0]).toEqual({ action: "changed", stage: "discuss", prompt: "Which outcomes changed most from my prediction?", run_id: ids.olderRun })
  await page.reload()
  await expect(page.getByText("The 00 outcome increased in this saved run.")).toBeVisible()
})
