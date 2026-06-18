import { test, expect } from '@playwright/test';

async function gotoLogin(page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
}

test.describe('Login Page', () => {
  test('displays login form', async ({ page }) => {
    await gotoLogin(page);
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await gotoLogin(page);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('shows error for invalid email format', async ({ page }) => {
    await gotoLogin(page);
    await page.getByLabel(/email address/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows server error on failed login', async ({ page }) => {
    await gotoLogin(page);
    await page.getByLabel(/email address/i).fill('wrong@clinic.demo');
    await page.getByLabel(/password/i).fill('badpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test('displays branding panel on desktop', async ({ page }) => {
    await gotoLogin(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText(/smarter care/i)).toBeVisible();
    await expect(page.getByText(/powered by ai/i)).toBeVisible();
  });

  test('mobile view hides branding panel', async ({ page }) => {
    await gotoLogin(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText(/smarter care/i)).not.toBeVisible();
  });
});

test.describe('Login Flow', () => {
  test('successful doctor login redirects to doctor dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('doctor@clinic.demo');
    await page.getByLabel(/password/i).fill('Doctor@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/doctor\/dashboard/, { timeout: 10000 });
  });

  test('successful receptionist login redirects to receptionist dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('receptionist@clinic.demo');
    await page.getByLabel(/password/i).fill('Recept@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/receptionist\/dashboard/, { timeout: 10000 });
  });
});
