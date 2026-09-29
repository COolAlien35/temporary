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

test("connected learner opens another saved run in Explain and reloads its run-bound tutor reply", async ({ page }) => {
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
  await expect(page.getByRole("table", { name: /Prediction agreement history/ }).getByRole("row", { name: /75\.0% 80% sampled frequency 1,024/ })).toBeVisible()
  await page.getByRole("button", { name: /75\.0% agreement · Open/ }).click()
  await expect(page.getByText(`Run ID: ${ids.olderRun}`)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`run=${ids.olderRun}`))
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 75.0 percent.")).toBeVisible()
  await page.getByRole("button", { name: "Discuss this run with Lab Partner →" }).click()
  await expect(page).toHaveURL(new RegExp(`run=${ids.olderRun}`))
  await page.getByRole("button", { name: "What changed?" }).click()
  await expect(page.getByText("The 00 outcome increased in this saved run.")).toBeVisible()
  expect(tutorPosts).toHaveLength(1)
  expect(tutorPosts[0]).toEqual({ action: "changed", stage: "discuss", prompt: "Which outcomes changed most from my prediction?", run_id: ids.olderRun })
  await page.goto(`/lab/superposition?stage=6&run=${ids.currentRun}`)
  await expect(page.getByText("Server-derived prediction agreement 98.0 percent.")).toBeVisible()
  await expect(page.getByText(`Saved run: ${ids.currentRun}`)).toBeVisible()
  await expect(page.getByRole("banner").getByText("98.0%", { exact: true })).toBeVisible()
  await expect(page.getByText("The 00 outcome increased in this saved run.")).not.toBeVisible()
  await page.getByRole("button", { name: "Explain", exact: true }).click()
  expect(tutorPosts[1]).toMatchObject({ action: "explain", run_id: ids.currentRun })
  await page.reload()
  await expect(page.getByText("The 00 outcome increased in this saved run.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Proceed to Debug Challenge" })).toHaveCount(0)
  await page.goto("/lab/superposition?stage=8")
  await expect(page.getByText("Connected grading is not available yet")).toBeVisible()
  await expect(page.getByRole("button", { name: "Submit for Scoring" })).toHaveCount(0)
})

test("connected learner locks a prediction, runs the exact circuit, and asks the tutor about the saved pair", async ({ page }) => {
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ids.user, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id: ids.user, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key", "Content-Type": "application/json" }
  const writes: { path: string; body: Record<string, unknown>; key: string | undefined }[] = []
  let polls = 0

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
    if (path === "/api/v1/curriculum/units/u1") return route.fulfill({ headers: cors, json: {
      id: "u1", title: "Quantum Foundations", content_version: 1, review_status: "faculty-reviewed", is_placeholder: false,
      lessons: [{ id: "u1-quantum-foundations", title: "Verified Superposition Lesson", sections: [{ type: "paragraph", text: "The server lesson explains a Hadamard on q0." }], takeaways: ["Compare the saved measurement with your prediction."] }],
    } })
    if (request.method() === "POST") writes.push({ path, body: request.postDataJSON() as Record<string, unknown>, key: request.headers()["idempotency-key"] })
    if (path === "/api/v1/learning-sessions" && request.method() === "POST") return route.fulfill({ headers: cors, json: { id: ids.currentSession, lesson_id: "u1-quantum-foundations", lesson_version: 1 } })
    if (path === `/api/v1/learning-sessions/${ids.currentSession}/predictions` && request.method() === "POST") return route.fulfill({ headers: cors, json: { ...request.postDataJSON() as Record<string, unknown>, id: ids.currentPrediction, locked_at: "2026-09-29T12:00:00Z", pairing_status: "unpaired", run_id: null } })
    if (path === "/api/v1/circuits" && request.method() === "GET") return route.fulfill({ headers: cors, json: { items: [], next_cursor: null } })
    if (path === "/api/v1/circuits" && request.method() === "POST") return route.fulfill({ headers: cors, json: {
      id: "99999999-9999-4999-8999-999999999999", revision: 1,
      snapshot: { schema_version: 1, ...request.postDataJSON() as Record<string, unknown> },
      checksum_sha256: "a".repeat(64), created_at: "2026-09-29T12:00:00Z", updated_at: "2026-09-29T12:00:00Z",
    } })
    if (path === "/api/v1/experiments/runs" && request.method() === "POST") return route.fulfill({ headers: cors, json: { resource_id: ids.currentRun, status: "queued" } })
    if (path === `/api/v1/experiments/runs/${ids.currentRun}`) return route.fulfill({ headers: cors, json: {
      id: ids.currentRun, status: ++polls === 1 ? "queued" : "succeeded", prediction_id: ids.currentPrediction,
      backend: "qiskit_aer", shots: 1024, circuit_revision: 1,
      circuit_snapshot: { schema_version: 1, name: "Superposition lab", qubits: 2, gates: [{ id: "gate-0", type: "H", step: 0, qubit: 0 }] },
    } })
    if (path === `/api/v1/predictions/${ids.currentPrediction}/pair`) return route.fulfill({ headers: cors, json: {
      schema_version: 1, prediction_id: ids.currentPrediction, run_id: ids.currentRun,
      prediction_vector: [0.26, 0.24, 0.25, 0.25], simulated_vector: [0.5, 0.5, 0, 0],
      basis_labels: ["00", "01", "10", "11"], measurement_qubits: [1, 0], comparison_basis: "sampled_frequency",
      metric_version: "tvd-v1", prediction_match: 0.5, backend: "qiskit_aer", shots: 1024, circuit_revision: 1,
    } })
    if (path === `/api/v1/learning-sessions/${ids.currentSession}/agreement-history`) return route.fulfill({ headers: cors, json: { lesson_id: "u1-quantum-foundations", lesson_version: 1, learning_session_id: ids.currentSession, items: [], scanned_count: 0, older_records_not_scanned: false, unavailable_sources: [] } })
    if (path === `/api/v1/learning-sessions/${ids.currentSession}/tutor/messages`) {
      if (request.method() === "GET") return route.fulfill({ headers: cors, json: [] })
      const body = request.postDataJSON() as Record<string, unknown>
      return route.fulfill({ headers: cors, json: { ...body, id: ids.tutorMessage, learning_session_id: ids.currentSession, status: "completed", role: "pedagogical_guide", prompt_version: "guide-v1", model: "test-tutor", source_record_ids: [ids.currentSession, ids.currentRun], response_text: "Your saved prediction gave equal weight to all four outcomes.", recommendation: null, provider_called: true, error_code: null, created_at: "2026-09-29T12:01:00Z", completed_at: "2026-09-29T12:01:01Z" } })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent("/lab/superposition?stage=4")}`)
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("button", { name: "Run saved prediction on Aer" })).toBeDisabled()
  await expect(page.getByText("Save and lock a prediction in Predict before starting a new Aer run", { exact: false })).toBeVisible()
  await page.getByRole("navigation", { name: "Lab stages" }).getByRole("button", { name: /1 Learn/ }).click()
  await expect(page.getByRole("heading", { name: "Verified Superposition Lesson" })).toBeVisible()
  await expect(page.getByText("The server lesson explains a Hadamard on q0.")).toBeVisible()
  await page.getByRole("button", { name: "Formulate Hypothesis →" }).click()
  const firstOutcome = page.getByRole("slider", { name: "Predicted probability for |00⟩" })
  const secondOutcome = page.getByRole("slider", { name: "Predicted probability for |01⟩" })
  await firstOutcome.focus()
  await firstOutcome.press("ArrowRight")
  await secondOutcome.focus()
  await secondOutcome.press("ArrowLeft")
  await expect(firstOutcome).toHaveValue("26")
  await expect(secondOutcome).toHaveValue("24")
  await expect(page.getByRole("slider", { name: "Prediction confidence" })).toHaveAttribute("aria-valuetext", /percent/)
  await page.getByRole("button", { name: "Save and Lock Prediction" }).click()
  await page.getByRole("button", { name: "Place H on q0 at step 0" }).click()
  await page.getByRole("region", { name: "Saved circuit library" }).getByRole("button", { name: "Save circuit" }).click()
  await expect(page.getByText("Saved Superposition circuit, revision 1.")).toBeVisible()
  await page.getByRole("button", { name: "Proceed to Run →" }).click()
  await expect(page.getByText("Selected library circuit: Superposition circuit, revision 1.")).toBeVisible()
  await page.getByRole("button", { name: "Run saved prediction on Aer" }).click()
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 50.0 percent.")).toBeVisible()
  await expect(page.getByRole("table", { name: /Server-derived outcome comparison/ })).toBeVisible()
  await expect(page.getByRole("row", { name: "|00⟩ 26.0% 50.0% +24.0 pts" })).toBeVisible()
  expect(polls).toBeGreaterThanOrEqual(2)
  expect(writes.map((item) => item.path)).toEqual([
    "/api/v1/learning-sessions", `/api/v1/learning-sessions/${ids.currentSession}/predictions`, "/api/v1/circuits", "/api/v1/experiments/runs",
  ])
  expect(writes.every((item) => Boolean(item.key))).toBe(true)
  expect(writes[2].body).toMatchObject({ qubits: 2, gates: [expect.objectContaining({ type: "H", step: 0, qubit: 0 })] })
  expect(writes[1].body).toMatchObject({ learning_session_id: ids.currentSession, prediction_vector: [0.26, 0.24, 0.25, 0.25] })
  expect(writes[3].body).toMatchObject({ prediction_id: ids.currentPrediction, circuit_id: "99999999-9999-4999-8999-999999999999", circuit_revision: 1, backend: "qiskit_aer" })
  await page.getByRole("button", { name: "Discuss this run with Lab Partner →" }).click()
  await page.getByRole("button", { name: "Explain", exact: true }).click()
  await expect(page.getByText("Your saved prediction gave equal weight to all four outcomes.")).toBeVisible()
  expect(writes[4].path).toBe(`/api/v1/learning-sessions/${ids.currentSession}/tutor/messages`)
  expect(writes[4].body).toMatchObject({ action: "explain", stage: "discuss", run_id: ids.currentRun })
  expect(writes[4].body).not.toHaveProperty("prediction_match")
})

test("switching connected accounts clears the open learner's lab draft and cannot show their run", async ({ context, page }) => {
  const secondUserId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const tokenFor = (id: string) => `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const firstToken = tokenFor(ids.user)
  const secondToken = tokenFor(secondUserId)
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key", "Content-Type": "application/json" }
  const providerUser = (id: string, email: string) => ({ id, aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" })
  let secondAccountReadDenied = false

  await context.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (path === "/auth/v1/token") {
      const email = (request.postDataJSON() as { email: string }).email
      const second = email === "second@example.test"
      const id = second ? secondUserId : ids.user
      return route.fulfill({ headers: cors, json: { access_token: second ? secondToken : firstToken, refresh_token: `refresh-${id}`, expires_in: 3600, token_type: "bearer", user: providerUser(id, email) } })
    }
    if (path === "/auth/v1/user") {
      const second = request.headers().authorization === `Bearer ${secondToken}`
      return route.fulfill({ headers: cors, json: providerUser(second ? secondUserId : ids.user, second ? "second@example.test" : "first@example.test") })
    }
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })
  await context.route("https://api.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    const second = request.headers().authorization === `Bearer ${secondToken}`
    const first = request.headers().authorization === `Bearer ${firstToken}`
    if (path === "/api/v1/me") return route.fulfill({ headers: cors, json: { id: second ? secondUserId : ids.user, name: second ? "Second Learner" : "First Learner", email: second ? "second@example.test" : "first@example.test", role: "learner" } })
    if (path === `/api/v1/experiments/runs/${ids.currentRun}` && second) {
      secondAccountReadDenied = true
      return route.fulfill({ status: 404, headers: cors, json: { error: { code: "not_found", message: "Run not found" } } })
    }
    if (!first) return route.fulfill({ status: 404, headers: cors, json: { error: { code: "not_found", message: "Record not found" } } })
    if (path === `/api/v1/experiments/runs/${ids.currentRun}`) return route.fulfill({ headers: cors, json: { id: ids.currentRun, status: "succeeded", prediction_id: ids.currentPrediction, backend: "qiskit_aer", shots: 1024, circuit_revision: 1, circuit_snapshot: { schema_version: 1, name: "Superposition lab", qubits: 2, gates: [] } } })
    if (path === `/api/v1/predictions/${ids.currentPrediction}`) return route.fulfill({ headers: cors, json: { id: ids.currentPrediction, lesson_id: "u1-quantum-foundations", learning_session_id: ids.currentSession } })
    if (path === `/api/v1/predictions/${ids.currentPrediction}/pair`) return route.fulfill({ headers: cors, json: { schema_version: 1, prediction_id: ids.currentPrediction, run_id: ids.currentRun, prediction_vector: [0.25, 0.25, 0.25, 0.25], simulated_vector: [0.5, 0.5, 0, 0], basis_labels: ["00", "01", "10", "11"], measurement_qubits: [1, 0], comparison_basis: "sampled_frequency", metric_version: "tvd-v1", prediction_match: 0.5, backend: "qiskit_aer", shots: 1024, circuit_revision: 1 } })
    if (path === `/api/v1/learning-sessions/${ids.currentSession}/agreement-history`) return route.fulfill({ headers: cors, json: { lesson_id: "u1-quantum-foundations", lesson_version: 1, learning_session_id: ids.currentSession, items: [], scanned_count: 0, older_records_not_scanned: false, unavailable_sources: [] } })
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent(`/lab/superposition?stage=5&run=${ids.currentRun}`)}`)
  await page.getByLabel("Email").fill("first@example.test")
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 50.0 percent.")).toBeVisible()
  await page.getByRole("navigation", { name: "Lab stages" }).getByRole("button", { name: /3 Build/ }).click()
  await page.getByRole("button", { name: "Place H on q0 at step 0" }).click()
  await expect(page.getByRole("button", { name: "Remove H on q0 at step 0" })).toBeVisible()

  const secondTab = await context.newPage()
  await secondTab.goto("/login")
  await secondTab.getByLabel("Email").fill("second@example.test")
  await secondTab.locator("#password").fill("test-password")
  await secondTab.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(secondTab).toHaveURL(/\/home/)
  await expect(page.getByRole("heading", { name: "Prediction vs. Actual" })).toBeVisible()
  await expect(page.getByText("No gates placed")).toBeVisible()
  await expect(page.getByText("Saved Aer comparison ready. Prediction agreement 50.0 percent.")).not.toBeVisible()
  await page.goto(`/lab/superposition?stage=5&run=${ids.currentRun}`)
  await expect(page.locator('p[role="status"][aria-live="polite"]')).toContainText("This saved run is unavailable for this account.")
  expect(secondAccountReadDenied).toBe(true)
})
