import { expect, test } from "@playwright/test"

test("a saved run link rejects mismatched pairs and distinguishes run states", async ({ page }) => {
  const userId = "77777777-7777-4777-8777-777777777777"
  const runId = "11111111-1111-4111-8111-111111111111"
  const pendingRunId = "44444444-4444-4444-8444-444444444444"
  const predictionId = "22222222-2222-4222-8222-222222222222"
  const pendingPredictionId = "55555555-5555-4555-8555-555555555555"
  const sessionId = "33333333-3333-4333-8333-333333333333"
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id: userId, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key", "Content-Type": "application/json" }
  let runState: "queued" | "failed" | "missing" | "succeeded" = "queued"
  let pendingRunState: "queued" | "cancelled" = "queued"
  let pairRunId = runId

  await page.route("https://provider.example.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (path === "/auth/v1/token") return route.fulfill({ headers: cors, json: { access_token: token, refresh_token: "test-refresh-token", expires_in: 3600, token_type: "bearer", user } })
    if (path === "/auth/v1/user") return route.fulfill({ headers: cors, json: user })
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (route.request().headers().authorization !== `Bearer ${token}`) return route.fulfill({ status: 401, headers: cors, json: { error: { code: "authentication_required", message: "Sign in" } } })
    if (path === "/api/v1/me") return route.fulfill({ headers: cors, json: { id: userId, name: "Connected Learner", email: user.email, role: "learner" } })
    if (path === "/api/v1/learning-sessions") return route.fulfill({ headers: cors, json: { items: [{ id: sessionId }], next_cursor: null } })
    if (path === `/api/v1/learning-sessions/${sessionId}/predictions`) return route.fulfill({ headers: cors, json: { items: [{ id: pendingPredictionId, pairing_status: "pending", run_id: pendingRunId }], next_cursor: null } })
    if (path === `/api/v1/experiments/runs/${pendingRunId}`) return route.fulfill({ headers: cors, json: { id: pendingRunId, status: pendingRunState, prediction_id: pendingPredictionId } })
    if (path === `/api/v1/jobs/${pendingRunId}/cancel` && route.request().method() === "POST") {
      pendingRunState = "cancelled"
      return route.fulfill({ headers: cors, json: { id: pendingRunId, status: "cancelled" } })
    }
    if (path === `/api/v1/experiments/runs/${runId}`) {
      if (runState === "missing") return route.fulfill({ status: 404, headers: cors, json: { error: { code: "not_found", message: "Not found" } } })
      return route.fulfill({ headers: cors, json: { id: runId, status: runState, prediction_id: predictionId, backend: "qiskit_aer", shots: 1024, circuit_revision: 1, circuit_snapshot: { schema_version: 1, name: "Superposition lab", qubits: 2, gates: [] } } })
    }
    if (path === `/api/v1/predictions/${predictionId}`) return route.fulfill({ headers: cors, json: { id: predictionId, lesson_id: "u1-quantum-foundations", learning_session_id: sessionId } })
    if (path === `/api/v1/predictions/${predictionId}/pair`) return route.fulfill({ headers: cors, json: { schema_version: 1, prediction_id: predictionId, run_id: pairRunId, prediction_vector: [0.5, 0.5, 0, 0], simulated_vector: [0.48, 0.52, 0, 0], basis_labels: ["00", "01", "10", "11"], measurement_qubits: [1, 0], comparison_basis: "sampled_frequency", metric_version: "tvd-v1", prediction_match: 0.98, backend: "qiskit_aer", shots: 1024, circuit_revision: 1 } })
    if (path === `/api/v1/learning-sessions/${sessionId}/agreement-history`) return route.fulfill({ headers: cors, json: { lesson_id: "u1-quantum-foundations", lesson_version: 1, learning_session_id: sessionId, items: [], scanned_count: 0, older_records_not_scanned: false, unavailable_sources: [] } })
    if (path === `/api/v1/learning-sessions/${sessionId}/tutor/messages`) return route.fulfill({ headers: cors, json: [] })
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent(`/lab/superposition?stage=5&run=${runId}`)}`)
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  const comparisonStatus = page.locator('p[role="status"][aria-live="polite"]')
  await expect(comparisonStatus).toContainText("This saved Aer run is queued. Check again for its comparison.")
  await expect(page.getByRole("table")).toHaveCount(0)

  runState = "failed"
  await page.getByRole("button", { name: "Check again" }).click()
  await expect(comparisonStatus).toContainText("This saved Aer run failed. No prediction comparison was recorded.")

  runState = "missing"
  await page.getByRole("button", { name: "Retry" }).click()
  await expect(comparisonStatus).toContainText("This saved run is unavailable for this account.")

  runState = "succeeded"
  pairRunId = "44444444-4444-4444-8444-444444444444"
  await page.getByRole("button", { name: "Retry" }).click()
  await expect(comparisonStatus).toContainText("This saved comparison does not match the requested run.")
  await expect(page.getByRole("table")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Discuss this run with Lab Partner →" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Find another saved run" })).toBeVisible()

  pairRunId = runId
  await page.getByRole("button", { name: "Retry" }).click()
  await expect(comparisonStatus).toContainText("Saved Aer comparison ready. Prediction agreement 98.0 percent.")
  await expect(page.getByRole("table", { name: /Server-derived outcome comparison/ })).toBeVisible()

  await page.getByRole("button", { name: "Return to Run" }).click()
  await page.getByRole("button", { name: "Recover recent saved run" }).click()
  await page.getByRole("button", { name: "Check saved run status" }).click()
  await expect(page).toHaveURL(new RegExp(`run=${pendingRunId}`))
  await expect(comparisonStatus).toContainText("This saved Aer run is queued. Check again for its comparison.")
  await expect(page.getByRole("table")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Discuss this run with Lab Partner →" })).toHaveCount(0)
  await page.getByRole("button", { name: "Cancel queued run" }).click()
  await expect(comparisonStatus).toContainText("This saved Aer run cancelled. No prediction comparison was recorded.")
  await expect(page.getByRole("button", { name: "Cancel queued run" })).toHaveCount(0)

  runState = "queued"
  await page.goto(`/lab/superposition?stage=6&run=${runId}`)
  await expect(comparisonStatus).toContainText("This saved Aer run is queued. Check again for its comparison.")
  await expect(page.getByRole("region", { name: "Saved run Lab Partner" })).toHaveCount(0)
  runState = "failed"
  await page.getByRole("button", { name: "Check again" }).click()
  await expect(comparisonStatus).toContainText("This saved Aer run failed. No prediction comparison was recorded.")
  await expect(page.getByRole("button", { name: "Find another saved run" })).toBeVisible()
  await page.getByRole("button", { name: "Find another saved run" }).click()
  await expect(page).toHaveURL(/stage=4/)
  await expect(page).not.toHaveURL(/run=/)
  runState = "succeeded"
  await page.goto(`/lab/superposition?stage=6&run=${runId}`)
  await expect(comparisonStatus).toContainText("Server-derived prediction agreement 98.0 percent.")
  await expect(page.getByRole("region", { name: "Saved run Lab Partner" })).toBeVisible()
})
