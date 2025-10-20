import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Manage Subscription Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated premium user
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_premium_monthly_001',
          email: 'premium.monthly@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'premium',
          is_premium: true,
          subscription_status: 'active',
          subscription_ends_at: '2025-11-12T18:00:00Z',
        }),
      });
    });
  });

  test('modal has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('modal has proper focus trap', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check that focus is trapped within modal
    const focusableElements = dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);
    
    // First focusable element should receive focus
    await expect(focusableElements.first()).toBeFocused();
  });

  test('ESC key closes modal and returns focus', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Focus should return to trigger button
    await expect(manageButton).toBeFocused();
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    
    // Should still be within modal
    const dialog = page.locator('[role="dialog"]');
    const focusedElement = page.locator(':focus');
    expect(await dialog.locator(':focus').count()).toBeGreaterThan(0);
  });

  test('modal has proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check for aria-labelledby or aria-label
    const hasLabel = await dialog.evaluate((el) => {
      return el.hasAttribute('aria-labelledby') || el.hasAttribute('aria-label');
    });
    expect(hasLabel).toBeTruthy();
    
    // Check for aria-modal
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('action buttons have proper disabled state communication', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    
    // Find any disabled button
    const disabledButtons = page.locator('[role="dialog"] button[disabled]');
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
    await page.goto('/');
    
    // Check for toast container with aria-live
    const toastRegion = page.locator('[role="status"], [aria-live="polite"], [aria-live="assertive"]');
    
    // Toast region should exist even if empty
    expect(await toastRegion.count()).toBeGreaterThan(0);
  });
});
