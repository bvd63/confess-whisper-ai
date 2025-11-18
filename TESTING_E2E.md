# E2E Testing Guide - ConfessAI

## 📋 Overview

This guide covers end-to-end testing for ConfessAI using Playwright.

## 🚀 Quick Start

### Prerequisites

```bash
npm ci
npx playwright install --with-deps chromium
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (with browser visible)
npm run test:e2e:headful

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with UI mode
npx playwright test --ui
```

## ⚙️ Configuration

### Environment Variables

Create `.env.test` (optional):

```env
BASE_URL=http://localhost:8080
PLAYWRIGHT_HEADLESS=true
```

### Playwright Config

- **Timeout**: 60s per test
- **Retries**: 1 local, 2 in CI
- **Workers**: 2 local, 1 in CI
- **Base URL**: <http://localhost:8080>
- **Web Server**: Auto-starts `npm run dev`

## 🧪 Test Structure

### Required Test Scenarios

1. **Auth Flow** (`auth.spec.ts`)
   - Register new user
   - Login existing user
   - Logout

2. **Confession Flow** (`confession.spec.ts`)
   - Create anonymous confession
   - Create confession with username
   - View confession in feed

3. **Subscription Flow** (`subscription.spec.ts`)
   - View VIP plans
   - Mock Stripe checkout redirect
   - Verify VIP status in UI

4. **Coins & Badges** (`coins.spec.ts`)
   - Award coins for actions
   - Display coin balance
   - Badge visibility

5. **Language Switch** (`i18n.spec.ts`)
   - Switch EN → ES → DE
   - Verify UI labels change

6. **Notifications** (`notifications.spec.ts`)
   - Mock OneSignal init
   - No real browser permissions

## 🎭 Mocking Strategy

### Supabase Auth

```typescript
// Mock in tests/helpers/auth.ts
await loginAs(page, "premium_monthly_active");
```

### Stripe Checkout

```typescript
// Intercept POST requests
await page.route("**/checkout**", (route) => {
  route.fulfill({ status: 302, headers: { Location: "/?success=true" } });
});
```

### OneSignal

```typescript
// Mock in page.addInitScript
window.OneSignal = {
  init: () => Promise.resolve(),
  Notifications: {
    requestPermission: () => Promise.resolve("granted"),
  },
};
```

## 🛡️ Guards & Validations

### Pre-test Guard

Automatically runs before `npm run test:e2e`:

```bash
node ./scripts/guard-no-skip-only.mjs
```

Fails if any `.skip()` or `.only()` found in test files.

### Forbidden Patterns

- ❌ `test.skip()`
- ❌ `describe.skip()`
- ❌ `test.only()`
- ❌ `describe.only()`

## 🐛 Troubleshooting

### Tests Timeout

- Check `webServer` is starting properly
- Increase `timeout` in playwright.config.ts
- Use `waitForLoadState('domcontentloaded')` instead of `'networkidle'`

### Flaky Tests

- Use explicit waits: `await expect(locator).toBeVisible({ timeout: 10000 })`
- Avoid `page.waitForTimeout()` - use deterministic waits
- Check for race conditions in beforeEach/afterEach

### Server Not Starting

```bash
# Kill existing process
lsof -ti:8080 | xargs kill -9

# Start manually
npm run dev
```

## 📊 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true
```

## ✅ Success Criteria

- ✅ All tests pass without skip/only
- ✅ Server auto-starts via webServer
- ✅ Deterministic, no flakiness
- ✅ Proper mocking of external services
- ✅ Fast feedback (<5min total runtime)

## 🔒 Rules

1. No functional changes to app code
2. Only update tests to match current UI
3. Minimal mocks (only external boundaries)
4. Clean code, no debug console.logs
5. Languages: EN/ES/DE only
6. Tiers: Free + VIP only
