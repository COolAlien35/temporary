import { expect, test } from '@playwright/test'
import { generateDesign } from '../lib/hardware/generator'
import { validateDesign } from '../lib/hardware/validate'

test('checks flag reused ordinary ports but allow feedthrough grids to fan out', () => {
  const design = generateDesign(1)
  expect(validateDesign(design).filter((issue) => issue.ruleId === 'port-capacity')).toHaveLength(0)
  const route = design.routes.find((item) => item.fromPort === 'out')!
  design.routes.push({ ...route, id: 'legacy-duplicate' })
  expect(validateDesign(design).some((issue) => issue.ruleId === 'port-capacity')).toBe(true)
})

test('a palette gate can be dragged onto a circuit wire', async ({ page }) => {
  await page.goto('/studio')
  const slot = page.getByTestId('circuit-slot-3-0')
  await expect(slot).toBeVisible()
  // dnd-kit measures the droppable after the pointer sensor activates. Move
  // through the canvas so the browser delivers those pointer moves on CI too.
  await page.getByTestId('palette-gate-H').first().dragTo(slot, { steps: 12 })
  await expect(slot).toHaveCount(0)
  await expect(page.getByTestId('circuit-slot-3-1')).toBeVisible()
})

test('hardware diagram connects compatible ports by dragging', async ({ page }) => {
  await page.goto('/hardware/studio')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: 'List view' }).click()
  await page.getByLabel('Component to place').selectOption('attenuator')
  await page.getByLabel('Stage to place on').selectOption('4K')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Diagram view' }).click()
  const source = page.locator('[data-port-id="out"]').first()
  const target = page.locator('[data-port-id="in"]').nth(1)
  await source.dragTo(target)
  const route = page.getByTestId('wiring-route')
  await expect(route).toHaveCount(1)
  const [sourceX, sourceY, targetX, targetY, path] = await Promise.all([
    source.getAttribute('cx'), source.getAttribute('cy'), target.getAttribute('cx'), target.getAttribute('cy'), route.getAttribute('d'),
  ])
  expect(path).toMatch(new RegExp(`^M ${sourceX} ${sourceY} C `))
  expect(path).toContain(`${targetX} ${targetY}`)
  await source.dragTo(page.locator('[data-port-id="in"]').nth(2))
  await expect(page.getByRole('status')).toContainText('already has a wire')
  await expect(route).toHaveCount(1)
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByText('Routes (1)')).toBeVisible()
})

test('hardware diagram supports two-click routing and reports incompatible signals in Checks', async ({ page }) => {
  await page.goto('/hardware/studio')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: 'List view' }).click()
  await page.getByLabel('Component to place').selectOption('attenuator')
  await page.getByLabel('Stage to place on').selectOption('4K')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Diagram view' }).click()
  await page.getByLabel('New route signal').selectOption('readout-out')
  await page.locator('[data-port-id="out"]').first().click()
  await page.locator('[data-port-id="in"]').nth(1).click()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByText('Routes (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Run checks' }).click()
  await expect(page.getByText(/isn't supported by both endpoints/)).toBeVisible()
})

test('a Low-pass Filter can be wired to a Circulator in the diagram', async ({ page }) => {
  await page.goto('/hardware/studio')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: 'List view' }).click()
  await page.getByLabel('Stage to place on').selectOption('4K')
  await page.getByLabel('Component to place').selectOption('lowpass-filter')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByLabel('Component to place').selectOption('circulator')
  await page.getByRole('button', { name: 'Place', exact: true }).click()
  await page.getByRole('button', { name: 'Diagram view' }).click()
  await page.locator('[data-port-id="out"]').first().dragTo(page.locator('[data-port-id="p1"]'))
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.getByText('Routes (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Run checks' }).click()
  await expect(page.getByText(/isn't supported by both endpoints/)).toBeVisible()
})

test('dashboard and profile pages use a static gradient backdrop', async ({ page }) => {
  for (const path of ['/home', '/settings', '/me']) {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('canvas[aria-hidden="true"]')).toHaveCount(0)
    await expect(page.locator('[aria-hidden="true"][style*="radial-gradient"]').first()).toBeVisible()
  }
})
