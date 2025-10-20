import { test, expect } from '@playwright/test';

test.describe('Update Payment Method Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_delinquent_001',
          email: 'delinquent@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'premium',
          is_premium: true,
          subscription_status: 'past_due',
          subscription_ends_at: '2025-11-12T18:00:00Z',
          payment_failed: true,
        }),
      });
    });
  });

  test('delinquent account shows payment update prominently', async ({ page }) => {
    await page.goto('/');
    
    // Should show warning banner or indicator
    await expect(page.getByText(/payment.*failed|past.*due|update.*payment/i)).toBeVisible();
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription|update.*payment/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Update payment button should be prominent
    const updateButton = dialog.getByRole('button', { name: /update.*payment/i });
    await expect(updateButton).toBeVisible();
  });

  test('opens payment element for card update', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const updateButton = dialog.getByRole('button', { name: /update.*payment/i });
    await updateButton.click();
    
    // Should show payment form
    await expect(page.getByText(/card.*number|payment.*method/i)).toBeVisible();
  });

  test('successfully updates payment method', async ({ page }) => {
    await page.route('**/functions/v1/billing-update-payment', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Payment method updated successfully',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const updateButton = dialog.getByRole('button', { name: /update.*payment/i });
    await updateButton.click();
    
    // Mock filling in payment details
    const cardNumberInput = page.locator('input[name="cardNumber"], [placeholder*="card"]').first();
    if (await cardNumberInput.isVisible()) {
      await cardNumberInput.fill('4242424242424242');
    }
    
    const submitButton = page.getByRole('button', { name: /save|update|submit/i });
    await submitButton.click();
    
    // Success toast
    await expect(page.getByText(/payment.*updated|success/i)).toBeVisible({ timeout: 5000 });
  });

  test('retries failed payment after successful update', async ({ page }) => {
    await page.route('**/functions/v1/billing-update-payment', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          retry_attempted: true,
          retry_successful: true,
          message: 'Payment method updated and retry succeeded',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const updateButton = dialog.getByRole('button', { name: /update.*payment/i });
    await updateButton.click();
    
    const cardNumberInput = page.locator('input[name="cardNumber"], [placeholder*="card"]').first();
    if (await cardNumberInput.isVisible()) {
      await cardNumberInput.fill('4242424242424242');
    }
    
    const submitButton = page.getByRole('button', { name: /save|update/i });
    await submitButton.click();
    
    // Should show retry success
    await expect(page.getByText(/retry.*success|payment.*processed/i)).toBeVisible({ timeout: 5000 });
  });

  test('handles payment update errors', async ({ page }) => {
    await page.route('**/functions/v1/billing-update-payment', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Invalid card details',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const updateButton = dialog.getByRole('button', { name: /update.*payment/i });
    await updateButton.click();
    
    const submitButton = page.getByRole('button', { name: /save|update/i });
    await submitButton.click();
    
    // Should show error
    await expect(page.getByText(/error|invalid|failed/i)).toBeVisible();
  });

  test('disables other actions while payment is past due', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Plan change buttons should be disabled
    const changeButtons = dialog.locator('button:has-text("Change"), button:has-text("Upgrade")');
    const count = await changeButtons.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(changeButtons.nth(i)).toBeDisabled();
      }
    }
  });
});
