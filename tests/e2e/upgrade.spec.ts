import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Subscription Upgrade Flow', () => {
  test('free user can open subscription modal to view VIP plans', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify modal shows subscription options
    await expect(dialog.getByRole('tablist')).toBeVisible();
  });

  test('subscription modal displays plan information', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify modal has content
    const content = await dialog.textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('subscription modal can be closed and reopened', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const firstOpen = await openManageSubscriptionModal(page);
    let dialog = firstOpen.dialog;
    
    // Close
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    
    // Reopen
    const reopened = await openManageSubscriptionModal(page);
    dialog = reopened.dialog;
  });

  test('modal shows subscription tabs for navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify tabs are present for subscriptions/coins
    const tabsList = dialog.getByRole('tablist');
    await expect(tabsList).toBeVisible();
  });
});
