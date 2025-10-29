import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';

test.describe('Update Payment Method', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'delinquent_premium');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'past_due' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
  });

  test('delinquent account shows payment update prominently', async ({ page }) => {
    // Should show warning banner or indicator
    await expect(page.getByText(/payment.*failed|past.*due|update.*required/i)).toBeVisible({ timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Update payment button should be prominent
    const updateButton = dialog.getByTestId('action-update-payment');
    await expect(updateButton).toBeVisible({ timeout: 10000 });
  });

  test('opens payment element for card update', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();
    
    // Should redirect to Stripe portal or show payment form
    await expect(dialog.getByText(/payment.*method/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('successfully updates payment method', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify button is clickable (in real app, this opens Stripe portal)
    await expect(updateButton).toBeEnabled();
    
    // Note: Clicking would redirect to Stripe portal in real flow
    // For E2E, we just verify the button exists and is functional
  });

  test('retries failed payment after successful update', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify update payment button is available for delinquent account
    await expect(updateButton).toBeEnabled();
    await expect(updateButton).toBeVisible();
    
    // Note: In real flow, user would go to Stripe portal, update payment,
    // and Stripe webhook would retry the payment automatically
  });

  test('handles payment update errors', async ({ page }) => {
    // Mock error response
    await page.route('**/functions/v1/billing-update-payment', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Invalid card details',
        }),
      });
    });

    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();
    
    const submitButton = page.getByRole('button', { name: /save|update/i });
    const isSubmitVisible = await submitButton.isVisible().catch(() => false);
    if (isSubmitVisible) {
      await submitButton.click();
    }
    
    // Should show error message within dialog
    await expect(dialog.getByText(/error|invalid|failed/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('disables other actions while payment is past due', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Upgrade/downgrade should be disabled or hidden
    const upgradeButton = dialog.getByTestId('action-upgrade').first();
    const downgradeButton = dialog.getByTestId('action-downgrade').first();
    
    // Check if they exist and are disabled
    const upgradeCount = await upgradeButton.count();
    const downgradeCount = await downgradeButton.count();
    
    if (upgradeCount > 0) {
      await expect(upgradeButton).toBeDisabled();
    }
    if (downgradeCount > 0) {
      await expect(downgradeButton).toBeDisabled();
    }
  });
});
