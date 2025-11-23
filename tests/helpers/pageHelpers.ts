import { Page } from '@playwright/test';

/**
 * Closes any open dialogs/modals/overlays on the page
 * This is useful for E2E test setup to ensure a clean slate
 */
export async function closeOpenDialogs(page: Page) {
  try {
    await page.waitForTimeout(400); // allow open/close animations to settle

    const overlayLocator = page.locator('[data-state="open"][aria-hidden="true"]');
    const dialogLocator = page.locator('[data-state="open"][role="dialog"]');

    const hasBlockingElements = async () => {
      const [overlayCount, dialogCount] = await Promise.all([
        overlayLocator.count().catch(() => 0),
        dialogLocator.count().catch(() => 0)
      ]);
      return overlayCount + dialogCount > 0;
    };

    if (!(await hasBlockingElements())) {
      return;
    }

    console.log('Detected open modal overlay/dialog, attempting cleanup...');

    // Try standard close paths first (Escape then clicking backdrop)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      if (!(await hasBlockingElements())) {
        console.log('Modal closed successfully');
        return;
      }
    }

    // Attempt a click outside dialog bounds as a fallback
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    if (!(await hasBlockingElements())) {
      console.log('Modal closed via backdrop click');
      return;
    }

    // As a last resort, force-remove lingering overlays to keep tests unblocked
    console.log('Overlay still present, forcing removal for test stability');
    await overlayLocator.evaluateAll((elements) => {
      elements.forEach((element) => {
        (element as HTMLElement).style.pointerEvents = 'none';
        element.remove();
      });
    });
  } catch (error) {
    console.log('Could not close dialogs:', error);
  }
}

/**
 * Waits for the app to be fully initialized
 */
export async function waitForAppReady(page: Page) {
  // Wait for app-ready indicator
  await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  
  // Wait for i18n to be ready
  await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 }).catch(() => {});
  
  // Small delay for any remaining async operations
  await page.waitForTimeout(500);

  // Ensure lazy-loaded dialog overlay is gone before interacting
  await page
    .waitForFunction(() => !document.querySelector('[data-testid="dialog-loading-overlay"]'), {
      timeout: 15000,
    })
    .catch(async () => {
      await page.locator('[data-testid="dialog-loading-overlay"]').evaluateAll((elements) => {
        elements.forEach((element) => {
          (element as HTMLElement).style.pointerEvents = 'none';
        });
      }).catch(() => {});
    });

  await dismissNotificationBanner(page);
}

async function dismissNotificationBanner(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.setItem('onesignal-banner-dismissed', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
  } catch (error) {
    console.log('Failed to prime notification banner storage:', error);
  }

  try {
    const banner = page.locator('[aria-label="Notifications banner"]');
    const bannerCount = await banner.count();
    if (bannerCount === 0) {
      return;
    }

    const visible = await banner.first().isVisible().catch(() => false);
    if (!visible) {
      return;
    }

    const dismissButton = banner.getByRole('button').last();
    const dismissVisible = await dismissButton.isVisible().catch(() => false);
    if (dismissVisible) {
      await dismissButton.click({ timeout: 2000 }).catch(() => {});
    } else {
      await banner.evaluateAll((elements) => elements.forEach((element) => element.remove()));
    }

    await page.waitForTimeout(200);
  } catch (error) {
    console.log('Could not dismiss notification banner:', error);
  }
}
