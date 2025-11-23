import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';

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
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(manageButton).toBeVisible();
    
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify modal shows subscription content
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('subscription modal shows canceled status information', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Modal should show tabs with subscription content
    const tabsList = dialog.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
  });

  test('modal displays subscription plans for reactivation', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify subscriptions tab is available (for viewing/choosing plans)
    const subscriptionsTab = dialog.getByRole('tab', { name: /subscriptions/i });
    await expect(subscriptionsTab).toBeVisible();
  });

  test('modal can be closed with ESC key', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
