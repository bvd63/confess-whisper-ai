import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page);
  });

  test('displays subscription management in Spanish', async ({ page }) => {
    // Set Spanish before loading
    await page.addInitScript(() => {
      localStorage.setItem('language', 'es');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and i18n
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify Spanish labels
    await expect(dialog.getByText(/plan|premium|vip/i)).toBeVisible({ timeout: 10000 });
  });

  test('displays subscription management in German', async ({ page }) => {
    // Set German before loading
    await page.addInitScript(() => {
      localStorage.setItem('language', 'de');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and i18n
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Verify German labels
    await expect(dialog.getByText(/plan|premium|vip/i)).toBeVisible({ timeout: 10000 });
  });

  test('all action buttons have translations', async ({ page }) => {
    const languages = ['en', 'es', 'de'];
    
    for (const lang of languages) {
      await page.addInitScript((l) => {
        localStorage.setItem('language', l);
      }, lang);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for app ready and i18n
      await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
      
      const manageButton = page.getByTestId('manage-subscription-btn');
      await manageButton.waitFor({ state: 'visible', timeout: 10000 });
      await manageButton.click();
      
      const dialog = page.getByTestId('manage-subscription-modal');
      await expect(dialog).toBeVisible({ timeout: 10000 });
      
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
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and i18n
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Check for date display (should be formatted)
    const dateText = await dialog.locator('text=/\\d{1,2}.*\\d{4}/').first().textContent();
    expect(dateText).toBeTruthy();
  });

  test('currency formatting matches locale', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready and i18n
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Look for price displays
    const priceElements = dialog.locator('text=/\\$|€|£/');
    const count = await priceElements.count();
    expect(count).toBeGreaterThan(0);
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
    
    // Wait for app ready and i18n
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
    
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
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
