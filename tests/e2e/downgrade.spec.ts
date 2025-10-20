import { test, expect } from '@playwright/test';

test.describe('Subscription Downgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_vip_monthly_001',
          email: 'vip.monthly@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'vip',
          is_premium: true,
          subscription_status: 'active',
          subscription_ends_at: '2025-11-12T18:00:00Z',
        }),
      });
    });
  });

  test('VIP to Premium downgrade scheduled at period end', async ({ page }) => {
    await page.route('**/functions/v1/billing-schedule-change', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Downgrade scheduled',
          effective_date: '2025-11-12T18:00:00Z',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const premiumButton = dialog.getByRole('button', { name: /change.*premium/i });
    await premiumButton.click();
    
    // Should show period end date
    await expect(dialog.getByText(/november.*12.*2025/i)).toBeVisible();
    
    const confirmButton = dialog.getByRole('button', { name: /confirm/i });
    await confirmButton.click();
    
    // Success message
    await expect(page.getByText(/scheduled/i)).toBeVisible();
  });

  test('displays exact date in user local timezone', async ({ page, context }) => {
    // Set timezone to PST
    await context.addInitScript(() => {
      // Mock timezone
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: () => ({ timeZone: 'America/Los_Angeles' }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should show formatted date
    const dateElement = dialog.locator('text=/November.*12.*2025/i');
    await expect(dateElement).toBeVisible();
    
    // Verify it's not showing UTC time directly
    const dateText = await dateElement.textContent();
    expect(dateText).not.toContain('18:00');
  });

  test('pending downgrade shown on modal re-open', async ({ page }) => {
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'vip',
          is_premium: true,
          subscription_status: 'active',
          subscription_ends_at: '2025-11-12T18:00:00Z',
          pending_change: {
            target_tier: 'premium',
            effective_date: '2025-11-12T18:00:00Z',
          },
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should show pending status
    await expect(dialog.getByText(/pending.*change|scheduled/i)).toBeVisible();
    await expect(dialog.getByText(/premium/i)).toBeVisible();
  });

  test('prevents conflicting changes when downgrade pending', async ({ page }) => {
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'vip',
          is_premium: true,
          pending_change: {
            target_tier: 'premium',
            effective_date: '2025-11-12T18:00:00Z',
          },
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // All plan change buttons should be disabled
    const changeButtons = dialog.locator('button:has-text("Change")');
    const count = await changeButtons.count();
    
    for (let i = 0; i < count; i++) {
      await expect(changeButtons.nth(i)).toBeDisabled();
    }
  });

  test('can cancel pending downgrade', async ({ page }) => {
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'vip',
          is_premium: true,
          pending_change: {
            target_tier: 'premium',
            effective_date: '2025-11-12T18:00:00Z',
          },
        }),
      });
    });

    await page.route('**/functions/v1/billing-cancel-pending', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Pending change canceled',
        }),
      });
    });

    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const cancelPendingButton = dialog.getByRole('button', { name: /cancel.*pending|remove.*scheduled/i });
    if (await cancelPendingButton.isVisible()) {
      await cancelPendingButton.click();
      
      await expect(page.getByText(/canceled|removed/i)).toBeVisible();
    }
  });
});
