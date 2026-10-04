import { expect, test } from "@playwright/test"

test("connected settings persist account preferences and recover a revision conflict", async ({ page }) => {
  const id = "77777777-7777-4777-8777-777777777777"
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id, aud: "authenticated", role: "authenticated", email: "learner@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, PATCH, POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, if-match", "Content-Type": "application/json" }
  let profile = { id, email: user.email, name: "First name", role: "learner", revision: 1, timezone: "UTC", preferences: { focus: "foundations", pace: "guided", reduceMotion: false }, created_at: "2026-09-29T00:00:00Z", updated_at: "2026-09-29T00:00:00Z" }
  const patches: { precondition: string | undefined; body: Record<string, unknown> }[] = []

  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (path === "/auth/v1/token") return route.fulfill({ headers: cors, json: { access_token: token, refresh_token: "refresh", expires_in: 3600, token_type: "bearer", user } })
    if (path === "/auth/v1/user") return route.fulfill({ headers: cors, json: user })
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (request.headers().authorization !== `Bearer ${token}`) return route.fulfill({ status: 401, headers: cors, json: { error: { code: "authentication_required", message: "Sign in" } } })
    if (path === "/api/v1/me" && request.method() === "GET") return route.fulfill({ headers: cors, json: profile })
    if (path === "/api/v1/me" && request.method() === "PATCH") {
      const body = request.postDataJSON() as Record<string, unknown>
      patches.push({ precondition: request.headers()["if-match"], body })
      if (patches.length === 1) {
        profile = { ...profile, name: "Changed elsewhere", revision: 2, preferences: { focus: "hardware", pace: "guided", reduceMotion: false } }
        return route.fulfill({ status: 412, headers: cors, json: { error: { code: "revision_conflict", message: "Profile has changed; reload before saving" } } })
      }
      profile = { ...profile, name: String(body.name), revision: 3, preferences: body.preferences as typeof profile.preferences }
      return route.fulfill({ headers: cors, json: profile })
    }
    return route.fulfill({ status: 404, headers: cors, json: { error: { code: "missing_fixture", message: `Unexpected route: ${path}` } } })
  })

  await page.goto(`/login?next=${encodeURIComponent("/settings")}`)
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("test-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  await expect(page.getByLabel("Display name")).toHaveValue("First name")
  await page.getByLabel("Display name").fill("My new name")
  await page.getByLabel("Learning pace").selectOption("self-paced")
  await page.getByRole("button", { name: "Save account settings" }).click()
  await expect(page.locator("form").getByRole("alert")).toContainText("Settings changed on another device")
  await expect(page.getByLabel("Display name")).toHaveValue("Changed elsewhere")
  await expect(page.getByLabel("Learning focus")).toHaveValue("hardware")
  await page.getByLabel("Display name").fill("Saved learner")
  await page.getByLabel("Learning pace").selectOption("self-paced")
  await page.getByRole("button", { name: "Save account settings" }).click()
  await expect(page.getByText("Account settings saved.")).toBeVisible()
  expect(patches.map((patch) => patch.precondition)).toEqual(['"rev-1"', '"rev-2"'])
  expect(patches[1].body).toMatchObject({ name: "Saved learner", preferences: { focus: "hardware", pace: "self-paced", reduceMotion: false } })
  await page.reload()
  await expect(page.getByLabel("Display name")).toHaveValue("Saved learner")
  await expect(page.getByLabel("Learning pace")).toHaveValue("self-paced")
  await expect(page.getByText("Frontend demo profile")).toHaveCount(0)
})
