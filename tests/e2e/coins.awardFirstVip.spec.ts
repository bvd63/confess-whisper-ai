import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('First VIP Payment Coin Award', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to be fully ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    
    // Wait for i18n to be ready
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('awards 250 coins on first VIP purchase', async ({ page }) => {
    // Mock the award-subscription-coins function
    await page.route('**/functions/v1/award-subscription-coins', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          ok: true, 
          awarded: 250,
          reason: 'first_vip_purchase' 
        }),
      });
    });

    // Open upgrade dialog
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.waitFor({ state: 'visible', timeout: 10000 });
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Upgrade to VIP
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.waitFor({ state: 'visible', timeout: 10000 });
    await vipButton.click();
    
    // Confirm upgrade
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Wait for success message
    await expect(page.getByText(/success|upgraded/i)).toBeVisible({ timeout: 15000 });
    
    // Verify coins were awarded (check for toast or coin display update)
    await expect(page.getByText(/250.*coin/i)).toBeVisible({ timeout: 10000 });
  });

  test('does not award coins on subsequent VIP renewals', async ({ page }) => {
    // Mock user already has VIP
    await loginAs(page, 'vip_monthly_active');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Mock the award function to return no award
    await page.route('**/functions/v1/award-subscription-coins', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          ok: false, 
          reason: 'already_awarded' 
        }),
      });
    });

    // Navigate to subscription page
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Should NOT see coin award message
    await expect(page.getByText(/250.*coin/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('awards coins only once per user (idempotency)', async ({ page }) => {
    let callCount = 0;
    
    // Track calls to award function
    await page.route('**/functions/v1/award-subscription-coins', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          ok: callCount === 1, 
          awarded: callCount === 1 ? 250 : 0,
          reason: callCount === 1 ? 'first_vip_purchase' : 'already_awarded'
        }),
      });
    });

    // First purchase
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.click();
    
    await expect(page.getByText(/250.*coin/i)).toBeVisible({ timeout: 10000 });
    
    // Verify only awarded once
    expect(callCount).toBe(1);
  });

  test('handles award failure gracefully', async ({ page }) => {
    // Mock award function failure
    await page.route('**/functions/v1/award-subscription-coins', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          ok: false, 
          error: 'Internal server error' 
        }),
      });
    });

    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.click();
    
    // Upgrade should still succeed even if coin award fails
    await expect(page.getByText(/success|upgraded/i)).toBeVisible({ timeout: 15000 });
  });
});
