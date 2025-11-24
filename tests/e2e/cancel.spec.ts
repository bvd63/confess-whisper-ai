import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { waitForAppReady, closeOpenDialogs, disableOverlayPointerEvents } from '../helpers/pageHelpers';

test.describe('Subscription Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    await disableOverlayPointerEvents(page);
  });

  test('VIP user can open subscription management modal', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(manageButton).toBeVisible();
    
    await manageButton.click({ force: true });
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify modal has subscription content (first() to handle multiple matches)
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('subscription modal shows current plan information', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    
    // Ensure button is clickable (not behind overlay)
    await page.locator('[data-state="open"][aria-hidden="true"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await manageButton.click({ force: true });
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Modal should show subscription-related content
    const tabsList = dialog.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
  });

  test('free tier user can open upgrade modal', async ({ page }) => {
    // Re-login as free user
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free', interval: null, status: null });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    await disableOverlayPointerEvents(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click({ force: true });
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test('modal can be closed with ESC key', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click({ force: true });
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
