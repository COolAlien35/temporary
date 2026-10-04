import { defineConfig, devices } from "@playwright/test"

const rawOrigin = process.env.QL_SMOKE_FRONTEND_URL ?? ""
let origin: URL
try {
  origin = new URL(rawOrigin)
} catch {
  throw new Error("QL_SMOKE_FRONTEND_URL must be a deployed HTTPS origin")
}
if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error("QL_SMOKE_FRONTEND_URL must be a deployed HTTPS origin")
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.live.ts",
  outputDir: "../reports/frontend/deployment-results",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: origin.origin,
    ...devices["Desktop Chrome"],
    trace: "off",
    screenshot: "off",
    video: "off",
  },
})
