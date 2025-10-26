# Cleanup Report

Date: 2025-10-26

## Summary

Surgical cleanup and verification performed without rebuilding from zero. Kept working features intact and focused on removing or disabling only unused or conflicting parts.

## Removed/Disabled

- Voice features (TTS/STT): No references found (Web Speech API, `speechSynthesis`, `SpeechRecognition`, TTS/STT) in `src/**`.
  - Action: None required.

## Dead Code Paths

- No explicit dead modules removed in this iteration. Future passes should target experimental pages and duplicate utilities after test coverage increases.

## Env Vars

- No additions/removals in this change. Verified usage in:
  - Stripe webhook (`supabase/functions/stripe-webhook/index.ts`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  - Stripe trial/coin functions: secret keys and price ids.

## Imports and Circular Deps

- No circular dependency detected during this iteration. ESLint/TS checks pending for broader refactor.

## Notes

- Subscription webhook already implements idempotency (events table) and upsert of subscriptions with derived tier/cadence from price ids.
- Additional cleanup recommended after tests are ≥95% to safely prune unused pages and legacy “Premium” paths.
