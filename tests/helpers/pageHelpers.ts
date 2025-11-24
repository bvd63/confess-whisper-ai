import { Page } from '@playwright/test';

/**
 * Closes any open dialogs/modals/overlays on the page
 * This is useful for E2E test setup to ensure a clean slate
 */
export async function closeOpenDialogs(page: Page) {
  try {
    // Wait a bit for any animations to complete
    await page.waitForTimeout(800);
    
    // Check for dialog overlay (the one that blocks clicks)
    const overlay = page.locator('[data-state="open"][aria-hidden="true"]').first();
    const isOverlayVisible = await overlay.isVisible().catch(() => false);
    
    if (isOverlayVisible) {
      console.log('Detected open modal overlay, attempting to close...');
      
      // Try pressing Escape multiple times
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        
        const stillVisible = await overlay.isVisible().catch(() => false);
        if (!stillVisible) {
          console.log('Modal closed successfully');
          break;
        }
      }
      
      // Final check - if still visible, try clicking outside the dialog
      const stillVisibleAfterEscape = await overlay.isVisible().catch(() => false);
      if (stillVisibleAfterEscape) {
        console.log('Escape key failed, trying to click outside dialog');
        await page.mouse.click(10, 10); // Click top-left corner
        await page.waitForTimeout(400);
      }
    }
  } catch (error) {
    // Ignore errors - this is best-effort cleanup
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
}
