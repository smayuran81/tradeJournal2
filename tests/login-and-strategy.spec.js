import { test, expect } from '@playwright/test';

test('user can login and navigate to strategy playbook', async ({ page }) => {
  // Navigate to the login page
  await page.goto('/login');
  
  // Wait for page to load and verify we're on the login page
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toContainText('TradingJournal Pro');
  
  // Fill in login credentials
  await page.fill('input[placeholder="Enter username"]', 'admin');
  await page.fill('input[placeholder="Enter password"]', 'admin123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard/strategy playbook
  await page.waitForURL('/');
  await page.waitForLoadState('networkidle');
  
  // Verify we're logged in and can see the Strategy Playbook
  await expect(page.locator('text=Strategy Playbook')).toBeVisible();
  
  // Wait for strategies to load
  await page.waitForTimeout(3000); // Wait for API call
  
  // Verify we can see the add strategy button (+ button)
  await expect(page.locator('button').filter({ hasText: '+' })).toBeVisible();
  
  // Test adding a new strategy
  await page.click('button:has-text("+")');
  await expect(page.locator('text=Add New Strategy')).toBeVisible();
  
  // Fill in strategy name
  await page.fill('input[placeholder="Enter strategy name..."]', 'Test Strategy');
  await page.click('button:has-text("Add Strategy")');
  
  // Verify the new strategy appears
  await expect(page.locator('text=Test Strategy')).toBeVisible();
  
  // Click on the new strategy to expand it
  await page.click('text=Test Strategy');
  
  // Verify we can see the Rules section
  await expect(page.locator('text=Rules')).toBeVisible();
});