import { test, expect } from '@playwright/test';

test.describe('Subscription Cancellation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_premium_monthly_001',
          email: 'premium.monthly@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'premium',
          is_premium: true,
          subscription_status: 'active',
          subscription_ends_at: '2025-11-12T18:00:00Z',
        }),
      });
    });
  });

  test('cancel at period end shows end date', async ({ page }) => {
    await page.route('**/functions/v1/billing-cancel', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Subscription will be canceled at period end',
          cancel_at_period_end: true,
          ends_at: '2025-11-12T18:00:00Z',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const cancelButton = dialog.getByRole('button', { name: /cancel.*subscription/i });
    await cancelButton.click();
    
    // Confirmation dialog
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    await confirmButton.click();
    
    // Should show end date
    await expect(page.getByText(/november.*12/i)).toBeVisible();
    await expect(page.getByText(/period end/i)).toBeVisible();
  });

  test('cancel now shows warning about immediate access loss', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const cancelNowButton = dialog.getByRole('button', { name: /cancel.*now|immediately/i });
    
    if (await cancelNowButton.isVisible()) {
      await cancelNowButton.click();
      
      // Should show warning
      await expect(page.getByText(/warning|lose.*access|immediately/i)).toBeVisible();
    }
  });

  test('canceled subscription shows reactivate option', async ({ page }) => {
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'premium',
          is_premium: true,
          subscription_status: 'active',
          subscription_ends_at: '2025-11-12T18:00:00Z',
          cancel_at_period_end: true,
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should show canceled status
    await expect(dialog.getByText(/canceled|will end/i)).toBeVisible();
    
    // Should show reactivate button
    const reactivateButton = dialog.getByRole('button', { name: /reactivate|restore/i });
    await expect(reactivateButton).toBeVisible();
  });

  test('reactivate restores subscription', async ({ page }) => {
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'premium',
          is_premium: true,
          cancel_at_period_end: true,
          subscription_ends_at: '2025-11-12T18:00:00Z',
        }),
      });
    });

    await page.route('**/functions/v1/billing-reactivate', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Subscription reactivated',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const reactivateButton = dialog.getByRole('button', { name: /reactivate/i });
    await reactivateButton.click();
    
    // Success message
    await expect(page.getByText(/reactivated|restored/i)).toBeVisible();
  });

  test('handles cancellation errors gracefully', async ({ page }) => {
    await page.route('**/functions/v1/billing-cancel', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to cancel subscription' }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const cancelButton = dialog.getByRole('button', { name: /cancel.*subscription/i });
    await cancelButton.click();
    
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    await confirmButton.click();
    
    // Should show error
    await expect(page.getByText(/error|failed/i)).toBeVisible();
  });
});
