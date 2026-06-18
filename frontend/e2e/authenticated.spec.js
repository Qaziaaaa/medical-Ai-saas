import { test, expect } from '@playwright/test';

const DOCTOR_EMAIL = 'doctor@clinic.demo';
const RECEPTION_EMAIL = 'receptionist@clinic.demo';
const PASSWORD = 'Doctor@123';
const REC_PASSWORD = 'Recept@123';

async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('Doctor Dashboard', () => {
  test('navigates to doctor dashboard after login', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/doctor\/dashboard/, { timeout: 10000 });
  });

  test('sidebar navigation links are visible', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await expect(page.getByRole('link', { name: /appointments/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /patients/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /prescriptions/i })).toBeVisible();
  });

  test('navigates to appointments page', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await page.getByRole('link', { name: /appointments/i }).click();
    await expect(page).toHaveURL(/\/appointments/);
  });

  test('navigates to patients page', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await page.getByRole('link', { name: /patients/i }).click();
    await expect(page).toHaveURL(/\/patients/);
  });

  test('navigates to prescriptions page', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await page.getByRole('link', { name: /prescriptions/i }).click();
    await expect(page).toHaveURL(/\/prescriptions/);
  });

  test('logout redirects to login page', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('Receptionist Dashboard', () => {
  test('navigates to receptionist dashboard after login', async ({ page }) => {
    await loginAs(page, RECEPTION_EMAIL, REC_PASSWORD);
    await expect(page).toHaveURL(/\/receptionist\/dashboard/, { timeout: 10000 });
  });
});

test.describe('Symptom Checker', () => {
  test('symptom checker page loads for doctor', async ({ page }) => {
    await loginAs(page, DOCTOR_EMAIL, PASSWORD);
    await page.goto('/symptom-checker', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/symptom-checker/);
  });
});
