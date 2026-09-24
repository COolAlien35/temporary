import { test, expect } from '@playwright/test'

const routes = [
  '/',
  '/home',
  '/hardware',
  '/hardware/catalog',
  '/hardware/checks',
  '/hardware/studio',
  '/studio',
  '/me',
  '/lab/deutsch-jozsa',
]

test.describe('page smoke coverage', () => {
  for (const route of routes) {
    test(`${route} renders without a browser error`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `unexpected response for ${route}`).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
      expect(errors, errors.join('\n')).toEqual([])
    })
  }
})

test('unknown lab algorithm has a useful recovery page', async ({ page }) => {
  await page.goto('/lab/not-a-real-algorithm')
  await expect(page.getByRole('heading', { name: 'Algorithm not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Roadmap' })).toHaveAttribute('href', '/home')
})

test('lab stage query is clamped to a valid stage', async ({ page }) => {
  await page.goto('/lab/deutsch-jozsa?stage=999')
  await expect(page.locator('body')).toContainText('Master')

  await page.goto('/lab/deutsch-jozsa?stage=not-a-number')
  await expect(page.locator('body')).toBeVisible()
})

test('landing auth card switches modes and preserves accessible fields', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign up', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email')
  await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'new-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Log in', exact: true }).last()).toBeVisible()
})
