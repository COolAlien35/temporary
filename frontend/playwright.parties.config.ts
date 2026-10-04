import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  testMatch: "parties.live.ts",
  outputDir: "../reports/frontend/parties",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3102", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: "cd ../backend && .venv/bin/python scripts/party_browser_fixture.py",
      url: "http://127.0.0.1:8011/browser-fixture",
      reuseExistingServer: false,
      env: { PYTHONPATH: ".", QL_DATABASE_URL: process.env.QL_DATABASE_URL ?? "postgresql+psycopg://quantumloop:quantumloop@localhost:5490/quantumloop", QL_CACHE_URL: process.env.QL_CACHE_URL ?? "redis://localhost:6380/0", QL_BROKER_URL: process.env.QL_BROKER_URL ?? "redis://localhost:6390/0" },
    },
    {
      command: "pnpm dev --hostname 127.0.0.1 --port 3102",
      url: "http://127.0.0.1:3102",
      timeout: 120000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_SUPABASE_URL: "https://provider.example.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key", NEXT_PUBLIC_QUANTUMLOOP_API_URL: "http://127.0.0.1:8011" },
    },
  ],
})
