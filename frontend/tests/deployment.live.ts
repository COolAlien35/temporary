import { expect, test } from "@playwright/test"

const emailA = process.env.QL_SMOKE_EMAIL_A ?? ""
const passwordA = process.env.QL_SMOKE_PASSWORD_A ?? ""
const emailB = process.env.QL_SMOKE_EMAIL_B ?? ""
const passwordB = process.env.QL_SMOKE_PASSWORD_B ?? ""

test("hosted learner run and tutor survive reload and stay owner-scoped", async ({ browser, page }) => {
  expect(emailA && passwordA && emailB && passwordB, "Set both QL_SMOKE_EMAIL/PASSWORD accounts").toBeTruthy()
  expect(emailA.toLowerCase(), "Test accounts must differ").not.toBe(emailB.toLowerCase())

  await page.goto(`/login?next=${encodeURIComponent("/lab/superposition?stage=4")}`)
  await expect(page.getByRole("button", { name: "Supabase account" })).toHaveAttribute("aria-pressed", "true")
  await page.getByLabel("Email").fill(emailA)
  await page.locator("#password").fill(passwordA)
  await page.locator("form").getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("button", { name: "Run saved prediction on Aer" })).toBeDisabled()

  await page.getByRole("navigation", { name: "Lab stages" }).getByRole("button", { name: /1 Learn/ }).click()
  await expect(page.getByRole("heading", { name: "Verified Superposition Lesson" })).toBeVisible()
  await page.getByRole("button", { name: "Formulate Hypothesis →" }).click()
  await page.getByRole("button", { name: "Save and Lock Prediction" }).click()
  await page.getByRole("button", { name: "Place H on q0 at step 0" }).click()
  await page.getByRole("region", { name: "Saved circuit library" }).getByRole("button", { name: "Save circuit" }).click()
  await expect(page.getByText("Saved Superposition circuit, revision 1.")).toBeVisible()
  await page.getByRole("button", { name: "Proceed to Run →" }).click()
  await page.getByRole("button", { name: "Run saved prediction on Aer" }).click()
  await expect(page.locator('p[role="status"][aria-live="polite"]')).toContainText("Saved Aer comparison ready.", { timeout: 120_000 })
  await expect(page.getByRole("table", { name: /Server-derived outcome comparison/ })).toBeVisible()
  const runId = new URL(page.url()).searchParams.get("run")
  expect(runId).toMatch(/^[0-9a-f-]{36}$/i)

  await page.reload()
  await expect(page.getByText(`Run ID: ${runId}`)).toBeVisible()
  await page.getByRole("button", { name: "Discuss this run with Lab Partner →" }).click()
  await expect(page.getByRole("region", { name: "Saved run Lab Partner" })).toBeVisible()
  const tutorRequest = page.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().includes("/tutor/messages"),
  )
  await page.getByRole("button", { name: "Explain", exact: true }).click()
  const tutorResponse = await tutorRequest
  expect(tutorResponse.status()).toBe(201)
  expect((await tutorResponse.json()).run_id).toBe(runId)
  await expect(page.getByRole("region", { name: "Saved run Lab Partner" }).getByText("Explain this saved run and its prediction comparison.")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("region", { name: "Saved run Lab Partner" }).getByText("Explain this saved run and its prediction comparison.")).toBeVisible()

  const origin = new URL(page.url()).origin
  const otherContext = await browser.newContext()
  try {
    const otherTab = await otherContext.newPage()
    await otherTab.goto(`${origin}/login`)
    await otherTab.getByLabel("Email").fill(emailB)
    await otherTab.locator("#password").fill(passwordB)
    await otherTab.locator("form").getByRole("button", { name: "Log in" }).click()
    await expect(otherTab).toHaveURL(/\/home$/)

    await otherTab.goto(`${origin}/lab/superposition?stage=5&run=${runId}`)
    await expect(otherTab.locator('p[role="status"][aria-live="polite"]')).toContainText("This saved run is unavailable for this account.")
    await expect(otherTab.getByText(`Run ID: ${runId}`)).toHaveCount(0)

    await page.reload()
    await expect(page.getByText(`Run ID: ${runId}`)).toBeVisible()
  } finally {
    await otherContext.close()
  }
})
