import { test, expect } from '@playwright/test';

test.describe('Public Routes', () => {
  test('login page loads with correct title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/ai clinic management/i);
  });

  test('not found page shows not found text', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page.getByText('NotFoundPage')).toBeVisible({ timeout: 10000 });
  });

  test('unauthorized page shows access denied', async ({ page }) => {
    await page.goto('/unauthorized');
    await expect(page.getByText('UnauthorizedPage')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Redirects', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/doctor/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('unauthenticated user redirected from any protected route', async ({ page }) => {
    await page.goto('/appointments');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
