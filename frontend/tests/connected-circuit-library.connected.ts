import { expect, test } from "@playwright/test"

test("connected learner saves, revises, and reopens a circuit without a local draft", async ({ page }) => {
  const userId = "77777777-7777-4777-8777-777777777777"
  const circuitId = "99999999-9999-4999-8999-999999999999"
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id: userId, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key, if-match", "Content-Type": "application/json" }
  let saved: { id: string; revision: number; snapshot: { schema_version: 1; name: string; qubits: number; gates: { id: string; type: string; step: number; qubit: number }[] }; checksum_sha256: string; created_at: string; updated_at: string } | null = null
  let writes = 0

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
    if (path === "/api/v1/me") return route.fulfill({ headers: cors, json: { id: userId, name: "Connected Learner", email: user.email, role: "learner" } })
    if (path === "/api/v1/circuits" && request.method() === "GET") return route.fulfill({ headers: cors, json: { items: saved ? [{ id: saved.id, name: saved.snapshot.name, revision: saved.revision, qubits: 2, gate_count: saved.snapshot.gates.length, checksum_sha256: saved.checksum_sha256, created_at: saved.created_at, updated_at: saved.updated_at }] : [], next_cursor: null } })
    if (path === "/api/v1/circuits" && request.method() === "POST") {
      expect(request.headers()["idempotency-key"]).toBeTruthy()
      const body = request.postDataJSON() as { name: string; qubits: number; gates: { id: string; type: string; step: number; qubit: number }[] }
      saved = { id: circuitId, revision: 1, snapshot: { ...body, schema_version: 1 }, checksum_sha256: "a".repeat(64), created_at: "2026-09-29T12:00:00Z", updated_at: "2026-09-29T12:00:00Z" }
      writes++
      return route.fulfill({ headers: cors, json: saved })
    }
    if (path === `/api/v1/circuits/${circuitId}` && request.method() === "GET" && saved) return route.fulfill({ headers: cors, json: saved })
    if (path === `/api/v1/circuits/${circuitId}` && request.method() === "PUT" && saved) {
      expect(request.headers()["if-match"]).toBe(`"rev-${saved.revision}"`)
      const body = request.postDataJSON() as typeof saved.snapshot
      saved = { ...saved, revision: saved.revision + 1, snapshot: { ...body, schema_version: 1 }, updated_at: "2026-09-29T12:01:00Z" }
      writes++
      return route.fulfill({ headers: cors, json: saved })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent("/lab/superposition?stage=3")}`)
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  const library = page.getByRole("region", { name: "Saved circuit library" })
  await expect(library.getByText("No saved circuits yet.")).toBeVisible()
  await page.getByRole("button", { name: "Place H on q0 at step 0" }).click()
  const sequence = page.getByRole("region", { name: "Readable gate sequence" })
  await expect(sequence.getByRole("row", { name: /t0 H q0/ })).toBeVisible()
  await library.getByLabel("Circuit name").fill("My H circuit")
  await library.getByRole("button", { name: "Save circuit" }).click()
  await expect(library.getByText("Saved My H circuit, revision 1.")).toBeVisible()
  await page.getByRole("button", { name: "Select Pauli X gate" }).click()
  await page.getByRole("button", { name: "Place X on q1 at step 1" }).click()
  await library.getByRole("button", { name: "Save revision 2" }).click()
  await expect(library.getByText("Saved My H circuit, revision 2.")).toBeVisible()
  expect(writes).toBe(2)

  await page.evaluate((id) => localStorage.removeItem(`quantumloop-demo-lab:${id}:superposition`), userId)
  await page.reload()
  await expect(page.getByRole("button", { name: "Place H on q0 at step 0" })).toBeVisible()
  await library.getByRole("button", { name: "Open" }).click()
  await expect(page.getByRole("button", { name: "Remove H on q0 at step 0" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Remove X on q1 at step 1" })).toBeVisible()
  await expect(sequence.getByRole("row", { name: /t1 X q1/ })).toBeVisible()
  await sequence.getByRole("row", { name: /t1 X q1/ }).getByRole("button", { name: "Edit in grid" }).click()
  await expect(page.getByRole("button", { name: "Remove X on q1 at step 1" })).toBeFocused()
  await expect(library.getByText("Opened My H circuit, revision 2.")).toBeVisible()
})
