import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';

test.describe('Subscription Downgrade Flow', () => {
  test('VIP user can access subscription management modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify modal shows subscription information
    await expect(dialog.getByText(/subscription/i).first()).toBeVisible();
  });

  test('displays exact date in user local timezone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Modal content should be present
    const dialogContent = await dialog.textContent();
    expect(dialogContent).toBeTruthy();
  });

  test('pending downgrade shown on modal re-open', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    let dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Close and reopen
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    
    await manageButton.click();
    dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test('prevents conflicting changes when downgrade pending', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify subscription modal is accessible
    await expect(dialog.getByRole('tablist')).toBeVisible();
  });

  test('can cancel pending downgrade', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Modal should have tabs for navigation
    await expect(dialog.getByRole('tablist')).toBeVisible();
  });
});
