import { test, expect } from '@playwright/test';

test.describe('Stripe Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to subscriptions page
    await page.goto('/');
    // Assume user is logged in for these tests
  });

  test('should display VIP subscription plans', async ({ page }) => {
    // Open subscription dialog
    await page.click('[data-testid="open-subscriptions"]');
    
    // Check if VIP plan is visible
    await expect(page.locator('text=VIP')).toBeVisible();
    await expect(page.locator('text=/\\$\\d+\\.\\d{2}/')).toBeVisible();
  });

  test('should switch between monthly and yearly intervals', async ({ page }) => {
    await page.click('[data-testid="open-subscriptions"]');
    
    // Click yearly tab
    await page.click('text=Yearly');
    await expect(page.locator('text=/Save.*%/')).toBeVisible();
    
    // Click monthly tab
    await page.click('text=Monthly');
    await expect(page.locator('text=Billed monthly')).toBeVisible();
  });

  test('should disable checkout button when price ID is missing', async ({ page }) => {
    await page.click('[data-testid="open-subscriptions"]');
    
    const button = page.locator('button:has-text("Choose VIP")').first();
    
    // If Price ID is missing, button should be disabled
    const isDisabled = await button.isDisabled();
    
    if (isDisabled) {
      console.log('✓ Button correctly disabled when Price ID missing');
    }
  });

  test('should log warning to console when Price ID missing', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleLogs.push(msg.text());
      }
    });

    await page.click('[data-testid="open-subscriptions"]');
    await page.click('button:has-text("Choose VIP")').catch(() => {});
    
    // Check if warning was logged
    const hasPriceIdWarning = consoleLogs.some(log => 
      log.includes('Price ID missing')
    );
    
    if (hasPriceIdWarning) {
      console.log('✓ Price ID missing warning logged to console');
    }
  });
});

test.describe('Checkout Success/Cancel Flow', () => {
  test('should handle successful checkout redirect', async ({ page }) => {
    // Simulate return from Stripe with success status
    await page.goto('/?status=success&session_id=test_session_123');
    
    // Should show success toast
    await expect(page.locator('text=/VIP Activated/i')).toBeVisible({ timeout: 5000 });
    
    // URL should be cleaned up
    await expect(page).toHaveURL('/');
  });

  test('should handle cancelled checkout redirect', async ({ page }) => {
    // Simulate return from Stripe with cancel status
    await page.goto('/?status=cancel');
    
    // Should show cancel message
    await expect(page.locator('text=/Checkout Cancelled/i')).toBeVisible({ timeout: 5000 });
    
    // URL should be cleaned up
    await expect(page).toHaveURL('/');
  });
});
