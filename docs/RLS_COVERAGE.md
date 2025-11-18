# Row-Level Security Coverage

This document tracks the database tables that participate in the authentication and billing flows together with their row-level security (RLS) posture. The goal is to keep a single place to confirm that every sensitive table ships with:

1. **RLS enabled** to prevent unauthenticated access
2. **Explicit policies** that describe who can read/write
3. **Normalization triggers** where user input could otherwise bypass uniqueness or policy constraints
4. **Helper RPCs** that expose strictly scoped operations for edge functions and automation

## Critical Tables

| Table                   | RLS        | Policies                                                                         | Triggers / Notes                                                                                                    |
| ----------------------- | ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `auth_sessions`         | ✅ Enabled | Users can view/insert/update/delete their own sessions, service role full access | `get_security_health_snapshot` aggregates active session counts; policy update now enforces `WITH CHECK` on updates |
| `failed_login_attempts` | ✅ Enabled | `Service role full access to failed_attempts`                                    | `trg_failed_login_normalize_email` lower-cases email before insert/update                                           |
| `captcha_requirements`  | ✅ Enabled | `Service role full access to captcha`                                            | `trg_captcha_requirements_normalize_email` enforces canonical email casing                                          |
| `security_events`       | ✅ Enabled | Users can view their own events, admins can view all, service role full access   | Logged exclusively via `log_security_event` RPC                                                                     |
| `subscriptions`         | ✅ Enabled | Users can read their subscription, service role manages lifecycle                | Accessed by Stripe sync worker only                                                                                 |
| `stripe_events`         | ✅ Enabled | Service role manages idempotency log                                             | Read/write restricted to webhook handler                                                                            |

## Helper Functions

| Function                                                           | Purpose                                                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `cleanup_expired_sessions()`                                       | Removes expired/revoked sessions (cron)                                     |
| `cleanup_old_failed_attempts()`                                    | Removes stale failed login rows                                             |
| `log_security_event(...)`                                          | Audits login/session lifecycle events                                       |
| `revoke_all_user_sessions(_user_id uuid)`                          | Immediately revokes every session for a user                                |
| `is_captcha_required(email)`                                       | Checks active CAPTCHA lock                                                  |
| `get_failed_login_count(email, minutes)`                           | Counts recent failures for adaptive CAPTCHA                                 |
| `mark_captcha_requirement(...)` / `clear_captcha_requirement(...)` | Manage enforced CAPTCHA windows                                             |
| `get_security_health_snapshot()`                                   | New RPC that returns aggregate security posture for service-role automation |

## Automated Verification

Run the targeted security test to ensure migrations keep RLS guarantees intact:

```bash
pnpm vitest run tests/security/rlsCoverage.test.ts
```

The test uses `scripts/security/rlsInventory.ts` to parse every Supabase migration and asserts that:

- RLS stays enabled on all critical tables
- Expected policies remain attached (including the new delete policy on `auth_sessions`)
- Normalization triggers exist on email-sensitive tables
- Helper RPCs are still defined in the schema

Any time a new table is introduced in the security/billing/auth surface area, extend `CRITICAL_TABLES` in `tests/security/rlsCoverage.test.ts` so regressions are caught automatically.
