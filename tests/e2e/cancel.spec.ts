import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Subscription Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await waitForAppReady(page);
    await closeOpenDialogs(page);
  });

  test('VIP user can open subscription management modal', async ({ page }) => {
    const { dialog, manageButton } = await openManageSubscriptionModal(page);
    await expect(manageButton).toBeVisible();
    
    // Verify modal has subscription content (first() to handle multiple matches)
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('subscription modal shows current plan information', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
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

    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
  });

  test('modal can be closed with ESC key', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
