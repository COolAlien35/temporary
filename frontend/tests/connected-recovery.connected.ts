import { expect, test } from "@playwright/test"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Content-Type": "application/json",
}

test("connected recovery requests a Supabase email while demo recovery remains local", async ({ page }) => {
  const requests: string[] = []
  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    requests.push(request.url())
    return route.fulfill({ headers: cors, json: {} })
  })
  await page.goto("/forgot-password")
  await expect(page.getByRole("button", { name: "Supabase account" })).toHaveAttribute("aria-pressed", "true")
  await page.getByLabel("Email").fill("recovery@example.test")
  await page.getByRole("button", { name: "Check recovery" }).click()
  await expect(page.getByRole("status")).toContainText("check your email")
  expect(requests).toHaveLength(1)
  expect(new URL(requests[0]).pathname).toBe("/auth/v1/recover")
  expect(new URL(requests[0]).searchParams.get("redirect_to")).toContain("/reset-password?connected=1")

  await page.getByRole("button", { name: "Local demo" }).click()
  await page.getByRole("button", { name: "Check recovery" }).click()
  await expect(page.getByRole("status")).toContainText("cannot send recovery emails")
  expect(requests).toHaveLength(1)
})

test("connected reset changes the password through Supabase and signs out locally", async ({ page }) => {
  const id = "99999999-9999-4999-8999-999999999999"
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`
  const user = { id, aud: "authenticated", role: "authenticated", email: "reset@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-09-29T00:00:00Z" }
  const updates: string[] = []
  let logouts = 0
  await page.route("https://provider.example.test/**", async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    if (path === "/auth/v1/token") return route.fulfill({ headers: cors, json: { access_token: token, refresh_token: "refresh", expires_in: 3600, token_type: "bearer", user } })
    if (path === "/auth/v1/user" && request.method() === "GET") return route.fulfill({ headers: cors, json: user })
    if (path === "/auth/v1/user" && request.method() === "PUT") {
      updates.push(request.postDataJSON().password)
      return route.fulfill({ headers: cors, json: { user } })
    }
    if (path === "/auth/v1/logout") { logouts++; return route.fulfill({ status: 204, headers: cors }) }
    return route.fulfill({ status: 404, headers: cors, json: { message: `Unexpected provider route: ${path}` } })
  })
  await page.route("https://api.example.test/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
    return route.fulfill({ headers: cors, json: { id, email: user.email, name: "Reset Learner", role: "learner", revision: 1, timezone: "UTC", preferences: { focus: "foundations", pace: "guided", reduceMotion: false }, created_at: user.created_at, updated_at: user.created_at } })
  })

  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill("old-password")
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.goto("/reset-password?connected=1")
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible()
  await page.getByLabel("New password", { exact: true }).fill("new-password-123")
  await page.getByLabel("Confirm new password").fill("new-password-123")
  await page.getByRole("button", { name: "Update password" }).click()
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible()
  expect(updates).toEqual(["new-password-123"])
  expect(logouts).toBe(1)
})
