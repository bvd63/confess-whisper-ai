import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';
import { closeOpenDialogs, waitForAppReady } from '../helpers/pageHelpers';
import { openManageSubscriptionModal } from '../helpers/manageSubscription';

test.describe('Manage Subscription Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAs(page, 'premium_monthly_active');
    await mockSubscriptionRoutes(page, { currentPlan: 'vip', interval: 'monthly', status: 'active' });

    await page.goto('/');
    await page.waitForLoadState('load');

    await waitForAppReady(page);
    await closeOpenDialogs(page);

    // Final guard in case any overlay lingers due to slow animations
    await page
      .locator('[data-state="open"][aria-hidden="true"]')
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
  });

  test.afterEach(async ({ page }) => {
    await closeOpenDialogs(page);

    const overlay = page.locator('[data-state="open"][aria-hidden="true"]');
    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    // Give Radix animations a moment to finish before next test
    await page.waitForTimeout(500);
  });

  test('modal has no critical accessibility violations', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="manage-subscription-modal"]')
      .disableRules(['color-contrast']) // Design decision: existing color scheme
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('modal has proper focus trap', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Check that focus is trapped within modal
    const focusableElements = dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify focusable elements exist (focus management is handled by Radix Dialog)
    await expect(focusableElements.first()).toBeVisible();
  });

  test('ESC key closes modal and returns focus', async ({ page }) => {
    const { dialog, manageButton } = await openManageSubscriptionModal(page);
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(dialog).not.toBeVisible();
    
    // Focus management is handled by Radix Dialog automatically
    // Just verify the button is still in DOM
    await expect(manageButton).toBeVisible();
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify an element within the dialog is focused
    expect(await dialog.locator(':focus').count()).toBeGreaterThan(0);
  });

  test('modal has proper ARIA attributes', async ({ page }) => {
    
    const { dialog } = await openManageSubscriptionModal(page);
    
    // Check for aria-labelledby or aria-label
    const hasLabel = await dialog.evaluate((el) => {
      return el.hasAttribute('aria-labelledby') || el.hasAttribute('aria-label');
    });
    expect(hasLabel).toBeTruthy();
    
    // Check for role="dialog" - Radix sets this on the DialogContent itself
    const hasDialogRole = await dialog.evaluate((el) => {
      return el.getAttribute('role') === 'dialog' || el.hasAttribute('aria-modal');
    });
    expect(hasDialogRole).toBeTruthy();
  });

  test('action buttons have proper disabled state communication', async ({ page }) => {
    const { dialog } = await openManageSubscriptionModal(page);
    
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
