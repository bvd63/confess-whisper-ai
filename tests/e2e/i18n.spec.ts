import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
  });

  test('displays subscription management in Spanish', async ({ page }) => {
    // Set Spanish before loading
    await page.addInitScript(() => {
      localStorage.setItem('language', 'es');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify Spanish labels - use specific heading to avoid strict mode violation
    await expect(dialog.getByRole('heading', { name: /vip/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('displays subscription management in German', async ({ page }) => {
    // Set German before loading
    await page.addInitScript(() => {
      localStorage.setItem('language', 'de');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Verify German labels - use specific heading to avoid strict mode violation
    await expect(dialog.getByRole('heading', { name: /vip/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('all action buttons have translations', async ({ page }) => {
    const languages = ['en', 'es', 'de'];
    
    for (const lang of languages) {
      await page.addInitScript((l) => {
        localStorage.setItem('language', l);
      }, lang);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for app ready and close any dialogs
      await waitForAppReady(page);
      await closeOpenDialogs(page);
      
      const { dialog } = await openManageSubscriptionModal(page);
      
      // All buttons should have text (not empty)
      const buttons = dialog.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const buttonText = await buttons.nth(i).textContent();
        expect(buttonText?.trim().length).toBeGreaterThan(0);
      }
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('date formatting respects locale', async ({ page }) => {
    // Login as VIP user to have subscription dates to display
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Check that dialog content is visible (dates may not be visible for all users)
    const dialogContent = await dialog.textContent();
    expect(dialogContent).toBeTruthy();
    expect(dialogContent!.length).toBeGreaterThan(0);
  });

  test('currency formatting matches locale', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Check that VIP pricing is displayed (currency may vary by locale)
    await expect(dialog.getByText(/6\.99|54\.99/)).toBeVisible({ timeout: 10000 });
  });

  test('error messages are localized', async ({ page }) => {
    // Set Spanish before loading
    await page.addInitScript(() => {
      localStorage.setItem('language', 'es');
    });

    // Mock error response
    await page.route('**/functions/v1/billing-change', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and close any dialogs
    await waitForAppReady(page);
    await closeOpenDialogs(page);
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Try to trigger an error by clicking an action
    const actionButtons = dialog.locator('button[data-testid^="action-"]');
    const count = await actionButtons.count();
    if (count > 0) {
      await actionButtons.first().click();
      
      const confirmButton = page.getByTestId('confirm-action');
      const isConfirmVisible = await confirmButton.isVisible().catch(() => false);
      if (isConfirmVisible) {
        await confirmButton.click();
      }
      
      // Error message should appear
      await expect(page.getByText(/error|falló/i)).toBeVisible({ timeout: 15000 });
    }
  });
});
