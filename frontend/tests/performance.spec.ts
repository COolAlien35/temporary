import { expect, test } from '@playwright/test'

test('catalog opens a 3D renderer only for the component being inspected', async ({ page }) => {
  await page.goto('/hardware/catalog')
  await expect(page.getByRole('heading', { name: 'Component Catalog' })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)

  await page.getByRole('button', { name: 'Inspect Attenuator in 3D' }).click()
  await expect(page.locator('canvas')).toHaveCount(1)
  await page.getByRole('button', { name: 'Close 3D' }).click()
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('key app pages stay within phone, tablet and desktop viewports', async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/home', '/curriculum', '/studio', '/hardware/catalog', '/hardware/studio', '/challenges', '/instructor/assignments', '/settings']) {
      await page.goto(route)
      await expect(page.locator('main')).toHaveCount(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} overflowed at ${width}px`).toBeLessThanOrEqual(width + 1)
    }
  }
})

test('tablet navigation keeps hardware pages reachable', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto('/home')
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Builder Studio' }).click()
  await expect(page).toHaveURL(/\/hardware\/studio$/)
})
