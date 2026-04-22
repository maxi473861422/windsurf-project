import { test, expect } from '@playwright/test';

test.describe('Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('GSD Atlas');
  });

  test('should navigate to search page', async ({ page }) => {
    await page.click('text=Search');
    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator('input[placeholder*="search"]')).toBeVisible();
  });

  test('should perform dog search', async ({ page }) => {
    await page.click('text=Search');
    await page.fill('input[placeholder*="search"]', 'Max');
    await page.click('button[type="submit"]');
    await expect(page.locator('.dog-card')).toBeVisible();
  });

  test('should navigate to dog detail page', async ({ page }) => {
    await page.click('text=Search');
    await page.fill('input[placeholder*="search"]', 'Max');
    await page.click('button[type="submit"]');
    
    // Click first dog card
    await page.click('.dog-card:first-child');
    await expect(page).toHaveURL(/\/dogs\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText('Max');
  });

  test('should display pedigree', async ({ page }) => {
    await page.click('text=Search');
    await page.fill('input[placeholder*="search"]', 'Max');
    await page.click('button[type="submit"]');
    await page.click('.dog-card:first-child');
    
    await page.click('text=Pedigree');
    await expect(page.locator('.pedigree-tree')).toBeVisible();
  });

  test('should display COI information', async ({ page }) => {
    await page.click('text=Search');
    await page.fill('input[placeholder*="search"]', 'Max');
    await page.click('button[type="submit"]');
    await page.click('.dog-card:first-child');
    
    await page.click('text=COI');
    await expect(page.locator('.coi-info')).toBeVisible();
  });

  test('should navigate to breeding simulator', async ({ page }) => {
    await page.click('text=Simulator');
    await expect(page).toHaveURL(/\/simulator/);
    await expect(page.locator('text=Breeding Simulator')).toBeVisible();
  });

  test('should select dogs for breeding simulation', async ({ page }) => {
    await page.click('text=Simulator');
    
    // Select sire
    await page.click('#sire-select');
    await page.click('option:first-child');
    
    // Select dam
    await page.click('#dam-select');
    await page.click('option:nth-child(2)');
    
    // Run simulation
    await page.click('button[type="submit"]');
    await expect(page.locator('.simulation-results')).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    // Login first
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Password123');
    await page.click('button[type="submit"]');
    
    // Navigate to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=My Dashboard')).toBeVisible();
  });
});
