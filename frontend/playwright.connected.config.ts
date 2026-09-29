import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PLAYWRIGHT_CONNECTED_PORT ?? 3101)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.connected.ts",
  outputDir: "../reports/frontend/connected-results",
  workers: 1,
  reporter: "list",
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://provider.example.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      NEXT_PUBLIC_QUANTUMLOOP_API_URL: "https://api.example.test",
    },
  },
})
