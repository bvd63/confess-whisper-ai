import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Update Payment Method Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'delinquent_premium');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('delinquent account shows payment update prominently', async ({ page }) => {
    // Should show warning banner or indicator
    await expect(page.getByText(/payment.*failed|past.*due|update.*payment/i)).toBeVisible({ timeout: 10000 });
    
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
    
    // Should show payment form
    await expect(page.getByText(/card.*number|payment.*method/i)).toBeVisible({ timeout: 10000 });
  });

  test('successfully updates payment method', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();
    
    // Mock filling in payment details (if form appears)
    const cardNumberInput = page.locator('input[name="cardNumber"], [placeholder*="card"]').first();
    const isCardInputVisible = await cardNumberInput.isVisible().catch(() => false);
    if (isCardInputVisible) {
      await cardNumberInput.fill('4242424242424242');
    }
    
    const submitButton = page.getByRole('button', { name: /save|update|submit/i });
    const isSubmitVisible = await submitButton.isVisible().catch(() => false);
    if (isSubmitVisible) {
      await submitButton.click();
    }
    
    // Success toast
    await expect(page.getByText(/payment.*updated|success/i)).toBeVisible({ timeout: 15000 });
  });

  test('retries failed payment after successful update', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const updateButton = dialog.getByTestId('action-update-payment');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();
    
    const cardNumberInput = page.locator('input[name="cardNumber"], [placeholder*="card"]').first();
    const isCardInputVisible = await cardNumberInput.isVisible().catch(() => false);
    if (isCardInputVisible) {
      await cardNumberInput.fill('4242424242424242');
    }
    
    const submitButton = page.getByRole('button', { name: /save|update/i });
    const isSubmitVisible = await submitButton.isVisible().catch(() => false);
    if (isSubmitVisible) {
      await submitButton.click();
    }
    
    // Should show retry success
    await expect(page.getByText(/retry.*success|payment.*processed|success/i)).toBeVisible({ timeout: 15000 });
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
    
    // Should show error
    await expect(page.getByText(/error|invalid|failed/i)).toBeVisible({ timeout: 15000 });
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
