import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Manage Subscription Header Visibility', () => {
  test('authenticated user sees header button', async ({ page }) => {
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    // Look for manage subscription button using test ID
    const manageButton = page.getByTestId('manage-subscription-btn');
    await expect(manageButton).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated user does not see header button', async ({ page }) => {
    // Don't call loginAs - leave user unauthenticated
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await expect(manageButton).not.toBeVisible();
  });

  test('free tier user sees upgrade option in header', async ({ page }) => {
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await expect(upgradeButton).toBeVisible({ timeout: 10000 });
    await expect(upgradeButton).toContainText(/upgrade/i);
  });
});
