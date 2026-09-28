import { test, expect } from '@playwright/test'

const routes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/settings',
  '/home',
  '/curriculum',
  '/curriculum/u1',
  '/curriculum/u1/u1-quantum-foundations',
  '/curriculum/u1/quiz',
  '/assignments',
  '/assignments/unknown',
  '/hardware',
  '/hardware/catalog',
  '/hardware/checks',
  '/hardware/studio',
  '/studio',
  '/challenges',
  '/challenges/balanced-qubit',
  '/challenges/balanced-qubit/attempts/unknown',
  '/challenges/code-practice',
  '/curriculum/practice',
  '/contests',
  '/contests/entanglement-speed',
  '/contests/practice',
  '/discussions',
  '/discussions/t1',
  '/leaderboard',
  '/instructor',
  '/instructor/assessments',
  '/instructor/assignments',
  '/instructor/assignments/unknown',
  '/instructor/curriculum',
  '/instructor/misconceptions',
  '/instructor/students',
  '/instructor/students/unknown',
  '/me',
  '/lab/superposition',
  '/lab/deutsch-jozsa',
  '/lab/grover',
  '/lab/grovers',
  '/lab/qaoa',
  '/lab/vqe',
]

test.describe('page smoke coverage', () => {
  for (const route of routes) {
    test(`${route} renders without a browser error`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `unexpected response for ${route}`).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('main')).toHaveCount(1)
      expect(errors, errors.join('\n')).toEqual([])
    })
  }
})

test('unknown lab algorithm has a useful recovery page', async ({ page }) => {
  await page.goto('/lab/not-a-real-algorithm')
  await expect(page.getByRole('heading', { name: 'Lab track unavailable' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Curriculum' })).toHaveAttribute('href', '/curriculum')
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
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Log in', exact: true }).last()).toBeVisible()
})

test('demo account can enter, update settings, refresh and log out', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('alex@example.edu')
  await page.getByLabel('Password', { exact: true }).fill('demo-pass-123')
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByText('Alex', { exact: true })).toBeVisible()
  await page.getByRole('banner').getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Display name').fill('Alex Rivera')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Profile name saved in this browser.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Display name')).toHaveValue('Alex Rivera')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('command palette navigates only to implemented pages', async ({ page }) => {
  await page.goto('/home')
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+k')
  await page.getByPlaceholder('Search pages and algorithms...').fill('Builder Studio')
  await page.getByText('Builder Studio', { exact: true }).click()
  await expect(page).toHaveURL(/\/hardware\/studio$/)
})

test('hardware lesson opens a preset and saves diagnosed edits across refresh', async ({ page }) => {
  await page.goto('/curriculum/u9/u9-cryostat-stages')
  await page.getByRole('link', { name: 'Open related tool' }).click()
  await expect(page).toHaveURL(/\/hardware\/studio/)
  await expect(page.getByRole('link', { name: 'Back to lesson' })).toHaveAttribute('href', '/curriculum/u9/u9-cryostat-stages')
  await expect(page.getByLabel('Design name')).toHaveValue('Single Transmon')

  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByText(/Placed components \([1-9]/)).toBeVisible()
  await page.getByLabel('Component to place').selectOption('hemt')
  await page.getByLabel('Stage to place on').selectOption('300K')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await expect(page.getByText(/Placed components \([1-9]/)).toBeVisible()
  await page.getByRole('button', { name: 'Run checks' }).click()
  await expect(page.getByText(/is placed on 300K/)).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await expect(page.getByText('Placed components (0)')).toBeVisible()
  await page.getByRole('button', { name: 'Load' }).click()
  await page.getByRole('menuitem', { name: 'Single Transmon' }).first().click()
  await expect(page.getByLabel('Design name')).toHaveValue('Single Transmon')
  await page.reload()
  await expect(page.getByLabel('Design name')).toHaveValue('Single Transmon')
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByText(/Placed components \([1-9]/)).toBeVisible()
  await page.getByRole('heading', { name: /Placed components/ }).locator('..').getByRole('button').first().click()
  await expect(page.getByText('Key specs')).toBeVisible()
  await page.getByRole('button', { name: '3D cryostat view' }).click()
  await expect(page.getByRole('button', { name: 'Open diagram view' })).toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await page.getByRole('button', { name: 'Diagram view' }).click()
  await expect(page.locator('[data-component-node]').first()).toBeVisible()
})

test('hardware list view can connect compatible ports with a chosen signal', async ({ page }) => {
  await page.goto('/hardware/studio')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: 'List view' }).click()
  await page.getByLabel('Component to place').selectOption('attenuator')
  await page.getByLabel('Stage to place on').selectOption('4K')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByLabel('From component').selectOption({ index: 1 })
  await page.getByLabel('To component').selectOption({ index: 2 })
  await page.getByLabel('Route signal type').selectOption('xy')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByText('Routes (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Run checks' }).click()
  await expect(page.getByText(/well under the 60 dB reference budget/)).toBeVisible()
})

test('hardware controls remain accessible on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/hardware/studio')
  await expect(page.getByPlaceholder('Search components...')).toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByLabel('Component to place')).toBeVisible()
  await expect(page.getByText('Nothing selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run checks' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('demo progress stays with its learner and can be reset', async ({ page }) => {
  async function logIn(email: string) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('demo-pass-123')
    await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible()
  }

  await logIn('first@example.edu')
  await page.goto('/curriculum/u1/u1-quantum-foundations')
  await page.getByRole('radio', { name: 'Two complex amplitudes whose squared magnitudes sum to 1' }).check()
  await page.getByRole('radio', { name: 'One sampled outcome, not every amplitude' }).check()
  await page.getByRole('button', { name: /Complete lesson · \+15 XP/ }).click()
  await page.goto('/curriculum')
  await expect(page.getByRole('link', { name: 'Quantum Foundations, 1 of 3 lessons complete' })).toBeVisible()
  await page.goto('/me')
  await expect(page.getByText('First · 15 XP · 1 lessons completed')).toBeVisible()
  await expect(page.getByText('Lessons, assessments, local simulations, and streaks update this passport as you learn.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your learning activity' })).toBeVisible()
  await expect(page.getByText('First Steps')).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()

  await logIn('second@example.edu')
  await page.goto('/curriculum')
  await expect(page.getByRole('link', { name: 'Quantum Foundations, 0 of 3 lessons complete' })).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()

  await logIn('first@example.edu')
  await page.goto('/curriculum')
  await expect(page.getByRole('link', { name: 'Quantum Foundations, 1 of 3 lessons complete' })).toBeVisible()
  await page.goto('/settings')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset demo progress' }).click()
  await page.goto('/curriculum')
  await expect(page.getByRole('link', { name: 'Quantum Foundations, 0 of 3 lessons complete' })).toBeVisible()
})

test('learning and motion preferences follow the demo profile', async ({ page }) => {
  async function signIn(email: string) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('demo-pass-123')
    await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
    await expect(page).toHaveURL(/\/home$/)
  }

  await signIn('preferences@example.edu')
  await page.goto('/settings')
  await page.getByLabel('Display name').fill('Pat Explorer')
  await page.getByRole('button', { name: 'Save name' }).click()
  await page.getByLabel('Learning focus').selectOption('algorithms')
  await page.getByLabel('Learning pace').selectOption('self-paced')
  await page.getByRole('checkbox', { name: 'Reduce motion' }).check()
  await expect(page.locator('html')).toHaveClass(/reduce-motion/)
  await page.reload()
  await expect(page.getByLabel('Display name')).toHaveValue('Pat Explorer')
  await expect(page.getByLabel('Learning focus')).toHaveValue('algorithms')
  await expect(page.getByLabel('Learning pace')).toHaveValue('self-paced')
  await expect(page.getByRole('checkbox', { name: 'Reduce motion' })).toBeChecked()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.locator('html')).not.toHaveClass(/reduce-motion/)

  await signIn('another@example.edu')
  await page.goto('/settings')
  await expect(page.getByLabel('Learning focus')).toHaveValue('foundations')
  await expect(page.getByRole('checkbox', { name: 'Reduce motion' })).not.toBeChecked()
  await page.getByRole('button', { name: 'Log out' }).click()

  await signIn('preferences@example.edu')
  await page.goto('/settings')
  await expect(page.getByLabel('Display name')).toHaveValue('Pat Explorer')
  await expect(page.getByLabel('Learning focus')).toHaveValue('algorithms')
  await expect(page.locator('html')).toHaveClass(/reduce-motion/)
})

test('recovery shows honest missing, expired, invalid and demo-token states', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.getByRole('heading', { name: 'Reset link missing' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Request a new link/ })).toHaveAttribute('href', '/forgot-password')

  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill('learner@example.edu')
  await page.getByRole('button', { name: 'Check recovery' }).click()
  await expect(page.getByRole('status')).toContainText('cannot send recovery emails')
  await page.getByRole('link', { name: 'Expired link' }).click()
  await expect(page.getByRole('heading', { name: 'Reset link expired' })).toBeVisible()
  await expect(page.getByText('No token was checked and no recovery email was sent.', { exact: false })).toBeVisible()

  await page.goto('/reset-password?preview=invalid')
  await expect(page.getByRole('heading', { name: 'Reset link invalid' })).toBeVisible()

  await page.goto('/reset-password?token=demo-token')
  await expect(page.getByRole('heading', { name: 'Reset unavailable in demo' })).toBeVisible()
  await expect(page.getByText('No password has been changed.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('New password')).toHaveCount(0)
})
