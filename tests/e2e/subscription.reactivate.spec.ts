import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';

test.describe('Subscription Reactivation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('reactivate canceled VIP subscription', async ({ page }) => {
    // Login as user with canceled subscription
    await loginAs(page, 'canceled_at_period_end_vip');
    await mockSubscriptionRoutes(page, { 
      currentPlan: 'vip', 
      interval: 'monthly', 
      status: 'canceled'
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);

    // Open manage subscription dialog
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Look for reactivate button
    const reactivateButton = dialog.getByTestId('action-reactivate').first();
    await reactivateButton.waitFor({ state: 'visible', timeout: 10000 });
    await reactivateButton.click();
    
    // Confirm reactivation
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Should show success message
    await expect(page.getByText(/success|reactivated/i)).toBeVisible({ timeout: 15000 });
  });

  test('reactivate updates subscription status immediately', async ({ page }) => {
    await loginAs(page, 'canceled_at_period_end_vip');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'canceled' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const reactivateButton = dialog.getByTestId('action-reactivate').first();
    await reactivateButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.click();
    
    // Wait for success
    await expect(page.getByText(/success/i)).toBeVisible({ timeout: 15000 });
    
    // Close dialog and verify subscription is active
    await dialog.getByRole('button', { name: /close/i }).click();
    
    // Should show active VIP status
    await expect(page.getByText(/vip/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows loading state during reactivation', async ({ page }) => {
    // Add delay to billing-resume mock
    await page.route('**/functions/v1/billing-resume', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await loginAs(page, 'canceled_at_period_end_vip');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'canceled' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const reactivateButton = dialog.getByTestId('action-reactivate').first();
    await reactivateButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.click();
    
    // Should show loading indicator
    await expect(dialog.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    
    // Button should be disabled
    await expect(confirmButton).toBeDisabled();
  });

  test('handles reactivation error gracefully', async ({ page }) => {
    // Mock reactivation failure
    await page.route('**/functions/v1/billing-resume', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to reactivate subscription' }),
      });
    });

    await loginAs(page, 'canceled_at_period_end_vip');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'canceled' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    const reactivateButton = dialog.getByTestId('action-reactivate').first();
    await reactivateButton.click();
    
    const confirmButton = dialog.getByTestId('confirm-action');
    await confirmButton.click();
    
    // Should show error message
    await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('cannot reactivate if subscription already active', async ({ page }) => {
    // Login as active VIP user
    await loginAs(page, 'vip_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Close any open dialogs
    const openDialog = page.locator('[data-state="open"][role="dialog"]');
    if (await openDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(openDialog).not.toBeVisible();
    }
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    
    // Should not show reactivate button for active subscription
    await expect(dialog.getByTestId('action-reactivate')).not.toBeVisible({ timeout: 5000 });
  });
});
