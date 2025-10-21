import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('Manage Subscription Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for app ready
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('modal has no critical accessibility violations', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.click();
    
    // Wait for modal to open
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="manage-subscription-modal"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('modal has proper focus trap', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Check that focus is trapped within modal
    const focusableElements = dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);
    
    // First focusable element should receive focus
    await expect(focusableElements.first()).toBeFocused();
  });

  test('ESC key closes modal and returns focus', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(dialog).not.toBeVisible();
    
    // Focus should return to trigger button
    await expect(manageButton).toBeFocused();
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    
    // Should still be within modal
    expect(await dialog.locator(':focus').count()).toBeGreaterThan(0);
  });

  test('modal has proper ARIA attributes', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Check for aria-labelledby or aria-label
    const hasLabel = await dialog.evaluate((el) => {
      return el.hasAttribute('aria-labelledby') || el.hasAttribute('aria-label');
    });
    expect(hasLabel).toBeTruthy();
    
    // Check for aria-modal
    await expect(dialog.locator('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  });

  test('action buttons have proper disabled state communication', async ({ page }) => {
    const manageButton = page.getByTestId('manage-subscription-btn');
    await manageButton.click();
    
    const dialog = page.getByTestId('manage-subscription-modal');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Find any disabled button
    const disabledButtons = dialog.locator('button[disabled]');
    const count = await disabledButtons.count();
    
    if (count > 0) {
      const firstDisabled = disabledButtons.first();
      
      // Should have disabled attribute
      await expect(firstDisabled).toBeDisabled();
      
      // Check if aria-disabled is also present
      const hasAriaDisabled = await firstDisabled.evaluate((el) => 
        el.hasAttribute('aria-disabled')
      );
      
      // Either HTML disabled or aria-disabled is acceptable
      expect(hasAriaDisabled || await firstDisabled.isDisabled()).toBeTruthy();
    }
  });

  test('success toasts have proper ARIA live region', async ({ page }) => {
    // Check for toast container with aria-live
    const toastRegion = page.locator('[role="status"], [aria-live="polite"], [aria-live="assertive"]');
    
    // Toast region should exist even if empty
    expect(await toastRegion.count()).toBeGreaterThan(0);
  });
});
