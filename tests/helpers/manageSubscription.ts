import { expect, Page } from '@playwright/test';
import { closeOpenDialogs } from './pageHelpers';

const RETRYABLE_ERROR_SNIPPETS = [
  'intercepts pointer events',
  'Element is not attached',
  'element is not an ElementHandle',
  'Timeout',
  'page.goto: Page crashed',
  'Target page, context or browser has been closed',
];

const shouldRetry = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message || '';
  return RETRYABLE_ERROR_SNIPPETS.some((fragment) => message.includes(fragment));
};

export const openManageSubscriptionModal = async (page: Page) => {
  const manageButton = page.getByTestId('manage-subscription-btn');
  await manageButton.waitFor({ state: 'visible', timeout: 10000 });

  const dialog = page.getByTestId('manage-subscription-modal');

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await manageButton.click({ timeout: 5000 });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      return { dialog, manageButton };
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === 2) {
        throw error;
      }

      await closeOpenDialogs(page);
      await page.waitForTimeout(250);
    }
  }

  throw lastError ?? new Error('Unable to open subscription modal after retries');
};
