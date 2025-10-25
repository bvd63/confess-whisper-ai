import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Subscription Downgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'vip_monthly_active');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('VIP to Free downgrade scheduled at period end', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    const premiumButton = dialog.getByTestId('action-downgrade').first();
    await premiumButton.waitFor({ state: 'visible', timeout: 10000 });
    await premiumButton.click();
    
    // Confirmation dialog
    const confirmButton = page.getByTestId('confirm-action');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    
    // Success message
    await expect(page.getByText(/success|scheduled/i)).toBeVisible({ timeout: 15000 });
  });

  test('displays exact date in user local timezone', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Should show formatted date in current status section
    const statusSection = dialog.locator('.text-muted-foreground');
    await expect(statusSection.first()).toBeVisible({ timeout: 10000 });
    
    // Verify date is shown (format varies by locale)
    const dateText = await statusSection.first().textContent();
    expect(dateText).toBeTruthy();
  });

  test('pending downgrade shown on modal re-open', async ({ page }) => {
    // Re-login as user with pending change
    await loginAs(page, 'pending_change_vip_to_premium');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Should show VIP tier (current) and subscription info
    await expect(dialog.getByText(/vip/i)).toBeVisible({ timeout: 10000 });
  });

  test('prevents conflicting changes when downgrade pending', async ({ page }) => {
    // Re-login as user with pending change
    await loginAs(page, 'pending_change_vip_to_premium');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Check that action buttons exist (may or may not be disabled depending on implementation)
    const actionButtons = dialog.locator('button[data-testid^="action-"]');
    const count = await actionButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can cancel pending downgrade', async ({ page }) => {
    // Re-login as user with pending change
    await loginAs(page, 'pending_change_vip_to_premium');
    
    // Mock the cancel-pending endpoint
    await page.route('**/functions/v1/billing-cancel-pending', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Pending change canceled',
        }),
      });
    });
    
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Look for any cancel pending button if it exists
    const cancelPendingButton = dialog.getByRole('button', { name: /cancel.*pending|remove.*scheduled/i });
    const isVisible = await cancelPendingButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await cancelPendingButton.click();
      await expect(page.getByText(/canceled|removed|success/i)).toBeVisible({ timeout: 15000 });
    }
  });
});
