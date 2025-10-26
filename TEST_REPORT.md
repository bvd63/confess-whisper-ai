# Test Report

Date: 2025-10-26

## Summary

- Unit test added for Manage Subscriptions checkout/portal redirects:
  - `tests/unit/EnhancedSubscriptionManager.checkout.test.tsx` – passes locally (2/2).
- Overall test pass rate is being improved; full CI run pending on main.

## How to run locally

```bash
npm run test:unit
npm run test:integration
# E2E requires Playwright browsers installed
npm run test:e2e
```

## Notable Areas

- Subscriptions: Basic unit coverage for redirect logic.
- Webhook fulfillment: covered by supabase functions (integration tests TBD).
- i18n: keys added; recommend adding language toggle tests next.

## Next Steps

- Increase integration test coverage for subscription state transitions (upgrade/downgrade/cancel/reactivate).
- Add language-switch tests for critical flows (Auth, Manage Subscriptions, Checkout/Portal CTA labels).
- Target ≥95% pass rate after stabilizing mocks and data fixtures.