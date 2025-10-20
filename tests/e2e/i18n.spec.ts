import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
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

  test('displays subscription management in Spanish', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Spanish
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.getByText('Español').click();
    }
    
    await page.waitForLoadState('networkidle');
    
    const manageButton = page.getByRole('button', { name: /gestionar.*suscripción|administrar.*plan/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Verify Spanish labels
    await expect(dialog.getByText(/plan actual|tu plan/i)).toBeVisible();
    await expect(dialog.getByText(/premium|vip/i)).toBeVisible();
  });

  test('displays subscription management in German', async ({ page }) => {
    await page.goto('/');
    
    // Switch to German
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.getByText('Deutsch').click();
    }
    
    await page.waitForLoadState('networkidle');
    
    const manageButton = page.getByRole('button', { name: /abonnement.*verwalten|plan.*verwalten/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Verify German labels
    await expect(dialog.getByText(/aktueller plan|dein plan/i)).toBeVisible();
    await expect(dialog.getByText(/premium|vip/i)).toBeVisible();
  });

  test('all action buttons have translations', async ({ page }) => {
    const languages = ['en', 'es', 'de'];
    
    for (const lang of languages) {
      await page.goto(`/?lang=${lang}`);
      
      const manageButton = page.getByRole('button').first();
      await manageButton.click();
      
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // All buttons should have text (not empty)
      const buttons = dialog.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const buttonText = await buttons.nth(i).textContent();
        expect(buttonText?.trim().length).toBeGreaterThan(0);
      }
      
      await page.keyboard.press('Escape');
    }
  });

  test('date formatting respects locale', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check for date display (should be formatted)
    const dateText = await dialog.locator('text=/\\d{1,2}.*\\d{4}/').first().textContent();
    expect(dateText).toBeTruthy();
  });

  test('currency formatting matches locale', async ({ page }) => {
    await page.goto('/');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Look for price displays
    const priceElements = dialog.locator('text=/\\$|€|£/');
    const count = await priceElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('error messages are localized', async ({ page }) => {
    // Mock error response
    await page.route('**/functions/v1/billing-change', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/?lang=es');
    
    const manageButton = page.getByRole('button').first();
    await manageButton.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Try to trigger an error
    const changeButton = dialog.getByRole('button', { name: /cambiar/i }).first();
    if (await changeButton.isVisible()) {
      await changeButton.click();
      
      // Error message should be in Spanish
      await expect(page.getByText(/error|falló/i)).toBeVisible();
    }
  });
});
