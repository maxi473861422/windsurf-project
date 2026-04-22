import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await page.click('text=Login');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.click('text=Login');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should navigate to registration form', async ({ page }) => {
    await page.click('text=Login');
    await page.click('text=Register');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    await page.click('text=Login');
    await page.click('text=Register');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Different123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });
});
