# Test Report

Date: 2025-10-26 (Updated)

## Summary

- ✅ Unit test added for Manage Subscriptions checkout/portal redirects:
  - `tests/unit/EnhancedSubscriptionManager.checkout.test.tsx` – passes locally (2/2).
- ✅ **NEW**: Referral rewards logic tests:
  - `tests/unit/referral-rewards.test.tsx` – validates +10/+20 coin awards and duplicate prevention (4/4).
- ✅ **NEW**: Coin awards on confession tests:
  - `tests/unit/coin-awards.test.tsx` – validates +2 coins on publish, draft/rejected exclusions (4/4).
- ✅ **NEW**: Badge/flair expiry logic tests:
  - `tests/unit/badge-expiry.test.tsx` – validates 5-day expiry, countdown, and deactivation (5/5).
- ✅ **NEW**: E2E Stripe checkout flow tests:
  - `tests/e2e/stripe-checkout.spec.ts` – validates plan display, interval switching, and success/cancel redirects (5/5).
- Overall test pass rate improved to **~70%+** with critical flows covered.

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

## Completed Improvements ✅

- ✅ Added referral rewards logic tests (duplicate prevention, coin awards)
- ✅ Added coin award tests (confession publish, draft/rejected exclusions)
- ✅ Added badge/flair expiry tests (5-day countdown, deactivation)
- ✅ Added E2E Stripe checkout tests (plan display, interval switching, success/cancel)
- ✅ Removed Mapbox dependencies (mapbox-gl, @mapbox/mapbox-gl-geocoder)
- ✅ Improved subscriptions UI (hidden Price ID warnings, restored Free plan)
- ✅ Health check endpoint ready for monitoring

## Next Steps

- Add integration tests for subscription state transitions (upgrade/downgrade/cancel/reactivate)
- Add language-switch tests for critical flows (Auth, Manage Subscriptions, Checkout/Portal CTA labels)
- Configure Stripe Price IDs in environment variables for production
- Target ≥95% pass rate after stabilizing mocks and data fixtures