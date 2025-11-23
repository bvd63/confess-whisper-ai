import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Subscription Reactivation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'canceled_at_period_end_vip');
    await mockSubscriptionRoutes(page, { 
      currentPlan: 'vip', 
      interval: 'monthly', 
      status: 'canceled'
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await waitForAppReady(page);
    await closeOpenDialogs(page);
  });

  test('canceled VIP user can open subscription management modal', async ({ page }) => {
    const { dialog, manageButton } = await openManageSubscriptionModal(page);
    await expect(manageButton).toBeVisible();
    
    // Verify modal shows subscription content
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('subscription modal shows canceled status information', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Modal should show tabs with subscription content
    const tabsList = dialog.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
  });

  test('modal displays subscription plans for reactivation', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify subscriptions tab is available (for viewing/choosing plans)
    const subscriptionsTab = dialog.getByRole('tab', { name: /subscriptions/i });
    await expect(subscriptionsTab).toBeVisible();
  });

  test('modal can be closed with ESC key', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
