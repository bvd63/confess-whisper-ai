import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { waitForAppReady } from '../helpers/pageHelpers';

test.describe('Offline experience', () => {
  test.afterEach(async ({ context }) => {
    await context.setOffline(false);
  });

  test('caches critical routes and serves offline fallback', async ({ page, context }) => {
    await loginAs(page, 'premium_monthly_active');

    await page.goto('/messages');
    await waitForAppReady(page);

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (error) {
          console.warn('SW registration failed in test', error);
        }
      }
    });

    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, {}, { timeout: 15000 });

    await context.setOffline(true);
    await page.reload();

    const offlineBanner = page.getByText(/Offline Mode/i);
    await expect(offlineBanner).toBeVisible({ timeout: 5000 });

    await page.goto('/offline-check');
    await expect(page.locator('text=You\'re Offline')).toBeVisible({ timeout: 5000 });

    await context.setOffline(false);
  });
});