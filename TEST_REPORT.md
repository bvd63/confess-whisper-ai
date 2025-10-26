# Test Report

Date: 2025-10-26

## Summary

- Unit test added for Manage Subscriptions checkout/portal redirects:
  - `tests/unit/EnhancedSubscriptionManager.checkout.test.tsx` – passes locally (2/2).
- Unit test added for bottom navigation behavior when inside a conversation:
  - `tests/unit/TabNavigationContext.switchTab.test.tsx` – passes locally (2/2).
- Stripe webhook observability improved with structured JSON logs (event receipt, upsert outcomes, unhandled event types, errors) in `supabase/functions/stripe-webhook/index.ts`.
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
- Navigation: Verified that switching tabs from an active conversation exits to the correct root and that re-tapping Messages resets to the conversation list.
- Webhook fulfillment: covered by supabase functions (integration tests TBD).
- i18n: keys added; recommend adding language toggle tests next.

## Next Steps

- Increase integration test coverage for subscription state transitions (upgrade/downgrade/cancel/reactivate).
- Add e2e test validating bottom navigation transitions while in a conversation.
- Add language-switch tests for critical flows (Auth, Manage Subscriptions, Checkout/Portal CTA labels).
- Target ≥95% pass rate after stabilizing mocks and data fixtures.
