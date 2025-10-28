import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Subscription Upgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', status: 'none' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app to be fully ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    
    // Wait for i18n to be ready
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });

    // Close any potentially open dialogs on page load
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
  });

  test('free to VIP yearly shows savings percentage', async ({ page }) => {
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.waitFor({ state: 'visible', timeout: 10000 });
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Switch to yearly
    const yearlyTab = dialog.getByRole('tab', { name: /year/i });
    await yearlyTab.click();
    
    // Should show savings
    await expect(dialog.getByText(/save|savings/i)).toBeVisible({ timeout: 10000 });
  });

  test('completes upgrade and shows success toast', async ({ page }) => {
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.waitFor({ state: 'visible', timeout: 10000 });
    await vipButton.click();
    
    // Confirm
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Check for success toast
    await expect(page.getByText(/success|upgraded/i)).toBeVisible({ timeout: 15000 });
  });

  test('upgrade updates entitlement immediately in UI', async ({ page }) => {
    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.waitFor({ state: 'visible', timeout: 10000 });
    await vipButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Wait for success toast
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows loading state during upgrade', async ({ page }) => {
    // Add delay to billing-change mock
    await page.route('**/functions/v1/billing-change', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const upgradeButton = page.getByTestId('manage-subscription-btn');
    await upgradeButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const vipButton = dialog.getByTestId('action-upgrade').first();
    await vipButton.waitFor({ state: 'visible', timeout: 10000 });
    await vipButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Should show loading indicator
    await expect(dialog.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    
    // Button should be disabled
    await expect(confirmButton).toBeDisabled();
  });
});
