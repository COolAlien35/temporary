import { expect, test } from "@playwright/test"
import { emptyDesign } from "../lib/hardware/generator"
import { decodeDesign, encodeDesign } from "../lib/hardware/url-codec"

test("hardware snapshot decoder rejects malformed stages and dangling wiring", () => {
  const design = emptyDesign()
  expect(decodeDesign(encodeDesign(design))).toEqual(design)
  const badStage = { ...design, stages: [{ ...design.stages[0], temperatureK: -1 }] }
  expect(decodeDesign(encodeDesign(badStage))).toBeNull()
  const dangling = { ...design, routes: [{ id: "wire", lineType: "xy" as const, fromPlacedId: "missing", fromPort: "out", toPlacedId: "other", toPort: "in", cableFamilyId: "ss-coax" as const, attenuationDb: 0, waypoints: [] }] }
  expect(decodeDesign(encodeDesign(dangling))).toBeNull()
  expect(decodeDesign("a".repeat(90001))).toBeNull()
})

test("demo hardware link opens a validated snapshot in a separate browser", async ({ page, browser }) => {
  await page.goto("/hardware/studio")
  await page.getByRole("button", { name: "List view", exact: true }).click()
  await page.getByRole("button", { name: "Place", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Placed components (1)", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Collaborate", exact: true }).click()
  await page.getByRole("button", { name: "Generate party link", exact: true }).click()
  const link = await page.getByRole("textbox", { name: "Generated party link" }).inputValue()
  expect(link).toContain("/hardware/studio#design=")
  expect(new URL(link).searchParams.has("party")).toBe(false)
  const context = await browser.newContext()
  try {
    const recipient = await context.newPage()
    await recipient.goto(link)
    await recipient.getByRole("button", { name: "List view", exact: true }).click()
    await expect(recipient.getByRole("heading", { name: "Placed components (1)", exact: true })).toBeVisible()
    await expect(recipient.getByRole("region", { name: "Collaboration party" })).not.toBeVisible()
  } finally { await context.close() }
})
