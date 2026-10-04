import { expect, test } from "@playwright/test"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
}

test("Supabase signup sends the name and waits for email confirmation; demo signup stays local", async ({ page }) => {
  const signupRequests: { email: string; password: string; data: { name: string } }[] = []
  let profileRequests = 0
  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (new URL(request.url()).pathname === "/auth/v1/signup") {
      signupRequests.push(request.postDataJSON())
      return route.fulfill({ headers: cors, json: {
        user: { id: "77777777-7777-4777-8777-777777777777", email: "new@example.test", user_metadata: { name: "Quantum Learner" } },
        session: null,
      } })
    }
    return route.fulfill({ status: 404, headers: cors, json: { message: "Unexpected provider route" } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    profileRequests++
    return route.fulfill({ status: 500, headers: cors, json: { message: "Unexpected API call" } })
  })

  await page.goto("/signup")
  await expect(page.getByRole("button", { name: "Supabase account" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "Local demo" })).toBeVisible()
  await page.getByLabel("Name").fill("  Quantum Learner  ")
  await page.getByLabel("Email").fill("new@example.test")
  await page.locator("#password").fill("strong-password-123")
  await page.getByLabel("Confirm password").fill("strong-password-123")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("status")).toContainText("Check your email to confirm your account")
  expect(signupRequests).toHaveLength(1)
  expect(signupRequests[0]).toMatchObject({ email: "new@example.test", password: "strong-password-123", data: { name: "Quantum Learner" } })
  expect(profileRequests).toBe(0)

  await page.getByRole("button", { name: "Local demo" }).click()
  await expect(page.getByText("Local demo: this creates a browser-only session.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(signupRequests).toHaveLength(1)
  expect(profileRequests).toBe(0)
})

test("Supabase signup with an immediate session loads the backend profile", async ({ page }) => {
  const id = "88888888-8888-4888-8888-888888888888"
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id, aud: "authenticated", role: "authenticated", email: "direct@example.test", app_metadata: {}, user_metadata: { name: "Direct Learner" }, created_at: "2026-09-29T00:00:00Z" }
  let profileRequests = 0
  let curriculumRequests = 0
  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    const path = new URL(request.url()).pathname
    if (path === "/auth/v1/signup") return route.fulfill({ headers: cors, json: { user, access_token: token, refresh_token: "refresh", expires_in: 3600, token_type: "bearer" } })
    if (path === "/auth/v1/user") return route.fulfill({ headers: cors, json: user })
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    expect(request.headers().authorization).toBe(`Bearer ${token}`)
    const path = new URL(request.url()).pathname
    if (path === "/api/v1/curriculum/units") {
      curriculumRequests++
      return route.fulfill({ headers: cors, json: [{ id: "u1", title: "Quantum Foundations", tagline: "Start with a qubit.", level: "Beginner", minutes: 30, prerequisites: [], lessons: [{ id: "u1-quantum-foundations" }], xpTotal: 0, badge: "", tools: [], review_status: "pending", is_placeholder: false, content_version: 1 }] })
    }
    expect(path).toBe("/api/v1/me")
    profileRequests++
    return route.fulfill({ headers: cors, json: { id, email: user.email, name: "Direct Learner", role: "learner", revision: 1, timezone: "UTC", preferences: { focus: "foundations", pace: "guided", reduceMotion: false }, created_at: user.created_at, updated_at: user.created_at } })
  })

  await page.goto("/signup")
  await page.getByLabel("Name").fill("Direct Learner")
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("strong-password-123")
  await page.getByLabel("Confirm password").fill("strong-password-123")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole("heading", { name: "Welcome, Direct Learner" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open Superposition lab" })).toHaveAttribute("href", "/lab/superposition")
  await expect(page.getByText("XP earned")).toHaveCount(0)
  expect(profileRequests).toBeGreaterThan(0)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Welcome, Direct Learner" })).toBeVisible()
  await page.goto("/curriculum")
  await expect(page.getByRole("heading", { name: "Learn by experimenting" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open connected Superposition lesson" })).toHaveAttribute("href", "/lab/superposition")
  await expect(page.getByText("XP", { exact: true })).toHaveCount(0)
  expect(curriculumRequests).toBeGreaterThan(0)
  await page.goto("/curriculum/u1/u1-quantum-foundations")
  await expect(page.getByRole("heading", { name: "This lesson uses demo progress" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Complete lesson/ })).toHaveCount(0)
})
