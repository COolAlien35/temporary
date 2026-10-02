import { expect, test } from "@playwright/test"

test("a temporary profile outage during token refresh keeps the connected learner in the lab", async ({ page }) => {
  const userId = "77777777-7777-4777-8777-777777777777"
  const tokenFor = (kind: string) => `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", kind, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const initialToken = tokenFor("initial")
  const refreshedToken = tokenFor("refreshed")
  const user = { id: userId, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key", "Content-Type": "application/json" }
  let refreshes = 0
  let failedProfiles = 0
  let refreshedLessonReads = 0

  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === "/auth/v1/token") {
      const refresh = url.searchParams.get("grant_type") === "refresh_token"
      if (refresh) refreshes += 1
      return route.fulfill({ headers: cors, json: { access_token: refresh ? refreshedToken : initialToken, refresh_token: refresh ? "second-refresh-token" : "first-refresh-token", expires_in: 3600, token_type: "bearer", user } })
    }
    if (url.pathname === "/auth/v1/user") return route.fulfill({ headers: cors, json: user })
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${url.pathname}` } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    const refreshed = request.headers().authorization === `Bearer ${refreshedToken}`
    if (path === "/api/v1/me") {
      if (refreshed) {
        failedProfiles += 1
        return route.fulfill({ status: 503, headers: cors, json: { error: { code: "temporarily_unavailable", message: "Profile service temporarily unavailable" } } })
      }
      return route.fulfill({ headers: cors, json: { id: userId, name: "Connected Learner", email: user.email, role: "learner" } })
    }
    if (path === "/api/v1/curriculum/units/u1") {
      if (refreshed) refreshedLessonReads += 1
      return route.fulfill({ headers: cors, json: { id: "u1", title: "Quantum Foundations", content_version: 1, review_status: "faculty-reviewed", is_placeholder: false, lessons: [{ id: "u1-quantum-foundations", title: "Verified Superposition Lesson", sections: [{ type: "paragraph", text: "The server lesson explains a Hadamard on q0." }], takeaways: ["Compare the saved measurement with your prediction."] }] } })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected API route: ${path}` } } })
  })

  await page.goto("/login?next=%2Fhome")
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "Welcome, Connected Learner" })).toBeVisible()

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.endsWith("-auth-token"))
    if (!key) throw new Error("Supabase session was not stored")
    const saved = JSON.parse(localStorage.getItem(key)!) as { expires_at: number }
    localStorage.setItem(key, JSON.stringify({ ...saved, expires_at: Math.floor(Date.now() / 1000) - 1 }))
  })
  const failedProfile = page.waitForResponse((response) => response.url().endsWith("/api/v1/me") && response.status() === 503)
  await page.getByRole("link", { name: "Open Superposition lab" }).click()
  await failedProfile
  await expect(page.getByRole("heading", { name: "Verified Superposition Lesson" })).toBeVisible()
  await expect.poll(() => refreshes).toBeGreaterThan(0)
  await expect.poll(() => failedProfiles).toBeGreaterThan(0)
  expect(refreshedLessonReads).toBeGreaterThan(0)
  await page.getByRole("button", { name: "Formulate Hypothesis →" }).click()
  await expect(page.getByRole("button", { name: "Save and Lock Prediction" })).toBeVisible()
  await expect(page.getByText("Sign in to open the current lesson.")).toHaveCount(0)
})
