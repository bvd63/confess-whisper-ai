import { test, expect } from '@playwright/test';

test.describe('Subscription Upgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_free_001',
          email: 'free@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'free',
          is_premium: false,
        }),
      });
    });
  });

  test('free to premium yearly shows savings percentage', async ({ page }) => {
    await page.route('**/functions/v1/billing-preview', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          target_price_id: 'price_1SJ0vvR7kygIyYg9yORadPGD',
          new_amount: 9999,
          currency: 'usd',
          billing_cycle: 'yearly',
          savings_percent: 17,
          is_upgrade: true,
        }),
      });
    });

    await page.goto('/');
    
    const upgradeButton = page.getByRole('button', { name: /upgrade|premium/i });
    await upgradeButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Switch to yearly
    const yearlyTab = dialog.getByRole('tab', { name: /year/i });
    await yearlyTab.click();
    
    // Should show 17% savings
    await expect(dialog.getByText(/17%.*save|save.*17%/i)).toBeVisible();
  });

  test('completes upgrade and shows success toast', async ({ page }) => {
    await page.route('**/functions/v1/billing-change', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Upgrade successful',
        }),
      });
    });

    await page.goto('/');
    
    const upgradeButton = page.getByRole('button', { name: /upgrade|premium/i });
    await upgradeButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const premiumButton = dialog.getByRole('button', { name: /select.*premium|choose.*premium/i }).first();
    await premiumButton.click();
    
    // Confirm
    const confirmButton = dialog.getByRole('button', { name: /confirm/i });
    await confirmButton.click();
    
    // Check for success toast
    await expect(page.getByText(/success|upgraded/i)).toBeVisible({ timeout: 5000 });
  });

  test('upgrade updates entitlement immediately in UI', async ({ page }) => {
    let profileTier = 'free';

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: profileTier,
          is_premium: profileTier !== 'free',
        }),
      });
    });

    await page.route('**/functions/v1/billing-change', async (route) => {
      profileTier = 'premium';
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    
    // Verify free tier indicators
    await expect(page.getByText(/free/i)).toBeVisible();
    
    const upgradeButton = page.getByRole('button', { name: /upgrade|premium/i });
    await upgradeButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const premiumButton = dialog.getByRole('button', { name: /select.*premium/i }).first();
    await premiumButton.click();
    
    const confirmButton = dialog.getByRole('button', { name: /confirm/i });
    await confirmButton.click();
    
    // Wait for UI to update
    await page.waitForTimeout(1000);
    
    // Reload to verify
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should now show premium tier
    await expect(page.getByText(/premium/i)).toBeVisible();
  });

  test('shows loading state during upgrade', async ({ page }) => {
    await page.route('**/functions/v1/billing-change', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    
    const upgradeButton = page.getByRole('button', { name: /upgrade|premium/i });
    await upgradeButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    const premiumButton = dialog.getByRole('button', { name: /select.*premium/i }).first();
    await premiumButton.click();
    
    const confirmButton = dialog.getByRole('button', { name: /confirm/i });
    await confirmButton.click();
    
    // Should show loading indicator
    await expect(dialog.locator('[data-loading="true"], .animate-spin')).toBeVisible();
    
    // Button should be disabled
    await expect(confirmButton).toBeDisabled();
  });
});
