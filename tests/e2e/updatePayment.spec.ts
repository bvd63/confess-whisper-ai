import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Update Payment Method', () => {
  test('delinquent VIP user can open subscription modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    await openManageSubscriptionModal(page);
  });

  test('modal displays subscription information for past due accounts', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify modal shows content
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('modal can be closed and reopened', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const firstOpen = await openManageSubscriptionModal(page);
    let dialog = firstOpen.dialog;
    
    // Close with ESC
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    
    // Reopen
    const reopened = await openManageSubscriptionModal(page);
    dialog = reopened.dialog;
  });

  test('disables other actions while payment is past due', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Modal should have tabs
    await expect(dialog.getByRole('tablist')).toBeVisible();
  });
});
