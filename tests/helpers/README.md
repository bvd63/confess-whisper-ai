# E2E Test Helpers

This directory contains utility functions for Playwright E2E tests to ensure reliable, fast, and maintainable tests.

## Auth Helper (`auth.ts`)

Provides programmatic login without real backend calls.

### Usage

```typescript
import { loginAs } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'premium_monthly_active');
  // User is now authenticated as premium monthly subscriber
});
```

### Available User Fixtures

- `free_user` - No active subscription
- `premium_monthly_active` - Active premium monthly subscription
- `vip_monthly_active` - Active VIP monthly subscription
- `premium_year_active` - Active premium yearly subscription
- `vip_year_active` - Active VIP yearly subscription
- `trial_premium_active` - Active trial period
- `canceled_at_period_end_premium` - Subscription set to cancel at period end
- `pending_change_vip_to_premium` - Pending downgrade scheduled
- `delinquent_premium` - Past due payment status

## Network Helper (`network.ts`)

Mocks all subscription-related API routes to prevent real network calls during tests.

### Usage

```typescript
import { mockSubscriptionRoutes } from '../helpers/network';

test.beforeEach(async ({ page }) => {
  await mockSubscriptionRoutes(page);
  // All subscription API routes are now mocked
});
```

### Mocked Endpoints

- `GET **/functions/v1/billing-preview` - Returns preview data for plan changes
- `POST **/functions/v1/billing-change` - Simulates immediate plan changes
- `POST **/functions/v1/billing-schedule-change` - Simulates scheduled plan changes
- `POST **/functions/v1/billing-cancel` - Simulates cancellation
- `POST **/functions/v1/billing-reactivate` - Simulates reactivation
- `POST **/functions/v1/billing-update-payment-method` - Simulates payment updates
- `POST **/functions/v1/subscription-manage` - Returns subscription status

### Idempotency Support

The network helper automatically handles idempotency keys to prevent duplicate request processing.

## Complete Test Example

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { mockSubscriptionRoutes } from '../helpers/network';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Set up authentication
    await loginAs(page, 'premium_monthly_active');
    
    // 2. Mock API routes
    await mockSubscriptionRoutes(page);
    
    // 3. Navigate and wait for app ready
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 4. Wait for app hydration
    await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
    
    // 5. Wait for i18n initialization
    await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
  });

  test('my test', async ({ page }) => {
    // Use stable test IDs
    const button = page.getByTestId('manage-subscription-btn');
    await button.click();
    
    // Assert on modal
    const modal = page.getByTestId('manage-subscription-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
  });
});
```

## Best Practices

### 1. Always Use Test IDs

Prefer `getByTestId()` over text-based selectors:

```typescript
// ✅ Good - stable
await page.getByTestId('manage-subscription-btn').click();

// ❌ Avoid - brittle, language-dependent
await page.getByRole('button', { name: /manage subscription/i }).click();
```

### 2. Wait for App Ready

Always wait for both app hydration and i18n before interacting:

```typescript
await page.getByTestId('app-ready').waitFor({ state: 'attached', timeout: 10000 });
await page.waitForFunction(() => (window as any).__i18nReady === true, { timeout: 10000 });
```

### 3. Use Generous Timeouts

Network calls and UI updates can be slow in CI:

```typescript
// ✅ Good
await expect(element).toBeVisible({ timeout: 10000 });

// ❌ Too short - may flake in CI
await expect(element).toBeVisible();
```

### 4. Wait for Specific Network Responses

When testing async operations, wait for the specific API response:

```typescript
await page.waitForResponse(
  res => res.url().includes('/billing-preview') && res.ok(),
  { timeout: 30000 }
);
```

### 5. Clean Assertions

Assert on final state, not intermediate states:

```typescript
// ✅ Good - tests final outcome
await expect(page.getByText(/success/i)).toBeVisible({ timeout: 15000 });

// ❌ Avoid - tests implementation details
await page.waitForTimeout(1000);
expect(somethingAboutLoadingState).toBe(true);
```

## Available Test IDs

### App-Level
- `app-ready` - Root app hydration indicator (non-visual)

### Header
- `manage-subscription-btn` - Manage/Upgrade subscription button

### Subscription Modal
- `manage-subscription-modal` - Modal root container
- `action-upgrade` - Upgrade action button
- `action-downgrade` - Downgrade action button  
- `action-cancel` - Cancel subscription button
- `action-update-payment` - Update payment method button
- `confirm-action` - Confirmation dialog confirm button

## Troubleshooting

### Test Times Out at `page.goto('/')`

- Ensure `webServer` in `playwright.config.ts` is correctly configured
- Check that dev server starts successfully (`npm run dev`)
- Verify `baseURL` matches the dev server port

### Test Times Out Waiting for Elements

- Confirm element has correct `data-testid` attribute
- Verify i18n is loaded before asserting on translated text
- Check that API routes are properly mocked

### Flaky Tests in CI

- Increase timeouts for CI environment
- Add explicit waits for `networkidle` after navigation
- Ensure serial test execution (`fullyParallel: false`)

### Selectors Not Found

- Use browser developer tools to inspect actual DOM
- Check if element is conditionally rendered
- Verify authentication state is correctly mocked
