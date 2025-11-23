import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { waitForAppReady } from '../helpers/pageHelpers';

test.describe('Authentication Flow', () => {
  test('should load home page for anonymous user', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppReady(page);
    
    // App should be ready
    await expect(page.getByTestId('app-ready')).toBeAttached({ timeout: 10000 });
    
    // Should show login button for anonymous users
    const loginBtn = page.getByRole('button', { name: /login|log in/i });
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
  });

  test('should login existing user', async ({ page }) => {
    // Use helper to mock login
    await loginAs(page, 'premium_monthly_active');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppReady(page);
    
    // Should show manage subscription button for logged in users
    const manageBtn = page.getByTestId('manage-subscription-btn');
    await expect(manageBtn).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to auth page when clicking login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForAppReady(page);
    
    const loginBtn = page.getByRole('button', { name: /login|log in/i });
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
    
    await loginBtn.click();
    
    // Should navigate to /auth
    await page.waitForURL('**/auth', { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
