import { test, expect } from '@playwright/test';

test.describe('Manage Subscription Header Visibility', () => {
  test('authenticated user sees header button', async ({ page }) => {
    // Mock authenticated session
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_premium_monthly_001',
          email: 'premium.monthly@test.com',
          user_metadata: {},
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
        }),
      });
    });

    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for manage subscription button or indicator in header
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await expect(manageButton).toBeVisible();
  });

  test('unauthenticated user does not see header button', async ({ page }) => {
    // Mock unauthenticated session
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const manageButton = page.getByRole('button', { name: /manage.*subscription/i });
    await expect(manageButton).not.toBeVisible();
  });

  test('free tier user sees upgrade option in header', async ({ page }) => {
    await page.route('**/auth/v1/user', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'user_free_001',
          email: 'free@test.com',
        }),
      });
    });

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          subscription_tier: 'free',
          is_premium: false,
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const upgradeButton = page.getByRole('button', { name: /upgrade|premium/i });
    await expect(upgradeButton).toBeVisible();
  });
});
