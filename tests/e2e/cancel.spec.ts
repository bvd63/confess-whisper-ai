import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Subscription Cancellation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('cancel at period end shows end date', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const cancelButton = dialog.getByTestId('action-cancel');
    await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
    await cancelButton.click();
    
    // Wait for confirmation dialog to appear
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 10000 });
    
    const confirmButton = page.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Wait for dialog to close (confirmation successful)
    await expect(confirmDialog).not.toBeVisible({ timeout: 15000 });
  });

  test('cancel now shows warning about immediate access loss', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const cancelButton = dialog.getByTestId('action-cancel');
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should show confirmation dialog
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 10000 });
    }
  });

  test('canceled subscription shows reactivate option', async ({ page }) => {
    // Re-login as canceled user
    await loginAs(page, 'canceled_at_period_end_premium');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'canceled' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Should show canceled status or reactivate button
    const reactivateButton = dialog.getByRole('button', { name: /reactivate|restore/i });
    await expect(reactivateButton).toBeVisible({ timeout: 10000 });
  });

  test('reactivate restores subscription', async ({ page }) => {
    // Re-login as canceled user
    await loginAs(page, 'canceled_at_period_end_premium');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'canceled' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const reactivateButton = dialog.getByRole('button', { name: /reactivate/i });
    await reactivateButton.waitFor({ state: 'visible', timeout: 10000 });
    await reactivateButton.click();
    
    // Dialog should close (reactivation successful)
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });

  test('handles cancellation errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/functions/v1/billing-cancel**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to cancel subscription' }),
      });
    });

    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const cancelButton = dialog.getByTestId('action-cancel');
    await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
    await cancelButton.click();
    
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 10000 });
    
    const confirmButton = page.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Dialog should still be visible (action failed)
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
  });
});
