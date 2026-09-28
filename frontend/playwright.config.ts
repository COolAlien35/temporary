import { defineConfig, devices } from '@playwright/test'

const production = Boolean(process.env.CI || process.env.PLAYWRIGHT_PRODUCTION)
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PLAYWRIGHT_PORT must be an integer from 1024 to 65535')
}
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests',
  outputDir: '../reports/frontend/results',
  fullyParallel: true,
  // Keep the existing suite deterministic; CI runs the built production server.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../reports/frontend/html' }],
    ['junit', { outputFile: '../reports/frontend/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: production
      ? `node scripts/serve-standalone.mjs ${port}`
      : `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !production,
    timeout: 120_000,
  },
})
