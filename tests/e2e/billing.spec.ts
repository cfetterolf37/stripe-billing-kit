import { test, expect } from '@playwright/test'

/**
 * E2E tests for billing flows.
 *
 * Unauthenticated tests run with no credentials.
 * Authenticated tests require TEST_USER_EMAIL and TEST_USER_PASSWORD env vars —
 * skip gracefully when not set (CI without test credentials).
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD

// ─── Unauthenticated ──────────────────────────────────────────────────────────

test.describe('Unauthenticated access', () => {
  test('/ redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/billing redirects to /login', async ({ page }) => {
    await page.goto('/billing')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('signup page renders email and password fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('/api/auth/session returns 401 when not logged in', async ({ request }) => {
    const res = await request.get('/api/auth/session')
    expect(res.status()).toBe(401)
  })

  test('/api/subscription returns 401 when not logged in', async ({ request }) => {
    const res = await request.get('/api/subscription')
    expect(res.status()).toBe(401)
  })
})

// ─── Authenticated ────────────────────────────────────────────────────────────

test.describe('Authenticated billing', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated tests')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL!)
    await page.fill('input[type="password"]', TEST_PASSWORD!)
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('billing page shows pricing table', async ({ page }) => {
    await page.goto('/billing')
    // Pricing table should have at least 3 plan cards
    const planCards = page.locator('[data-testid="plan-card"]')
    await expect(planCards).toHaveCount(3)
  })

  test('billing page shows monthly/yearly toggle', async ({ page }) => {
    await page.goto('/billing')
    await expect(page.getByRole('button', { name: /monthly/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /yearly/i })).toBeVisible()
  })

  test('/api/auth/session returns user id and email', async ({ page, request }) => {
    // Already logged in via beforeEach
    const res = await request.get('/api/auth/session')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('email')
  })

  test('/api/subscription returns subscription state', async ({ request, page }) => {
    const res = await request.get('/api/subscription')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('plan')
    expect(body).toHaveProperty('isActive')
    expect(['free', 'pro', 'team']).toContain(body.plan)
  })
})
