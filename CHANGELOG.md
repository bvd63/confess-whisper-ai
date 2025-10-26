# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Subscriptions: Added Stripe Checkout and Customer Portal actions in `src/components/EnhancedSubscriptionManager.tsx`.
  - Helpers: `startCheckout(plan)` and `openPortal(customerId)` using existing API endpoints.
  - UI: Three buttons (monthly/yearly/portal) always visible; disabled only while loading.
  - i18n: Added EN/ES/DE strings for the quick actions.
  - Tests: Added `tests/unit/EnhancedSubscriptionManager.checkout.test.tsx` to validate redirects.

### Changed
- i18n dictionary/types extended with new subscription quick-action keys.

### Fixed
- Ensured “Buy/Upgrade” routes to Checkout and “Manage billing” routes to Customer Portal.

### Security/Observability
- Webhook fulfillment reviewed: existing idempotency check and subscription upsert present in `supabase/functions/stripe-webhook/index.ts`.

---

## [Prior]
- Various test infra and lint improvements in earlier commits.