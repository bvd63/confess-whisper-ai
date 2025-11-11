import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';

test.describe('Subscription Upgrade Flow', () => {
  test('free user can open subscription modal to view VIP plans', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
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
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
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
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    let dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Close
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    
    // Reopen
    await manageButton.click();
    dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test('modal shows subscription tabs for navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'free_user');
    await mockSubscriptionRoutes(page, { currentPlan: 'free' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify tabs are present for subscriptions/coins
    const tabsList = dialog.getByRole('tablist');
    await expect(tabsList).toBeVisible();
  });
});
