# JWT Rotation & Turnstile Hardening Design

_Last updated: 2025-11-15_

## 1. Objective

- Eliminate reusable refresh tokens by rotating them on every successful refresh and immediately revoking the prior value.
- Detect anomalous refresh usage (IP/device changes, replay timing, brute-force churn) and force Cloudflare Turnstile before issuing new credentials.
- Keep API ergonomics stable for the frontend hooks (`useEnhancedAuth`, `useAuthRefresh`) while tightening storage, logging, and rate limiting.

## 2. Current State

- `supabase/functions/enhanced-auth` already owns login, refresh, session listing, and revocation.
- Refresh tokens are generated per login, SHA-256 hashed, and stored in `public.auth_sessions.token_hash` alongside device metadata.
- Up to 5 active sessions per user; old sessions revoked on new logins.
- Turnstile validation currently occurs during signup/reset and for login after `MAX_FAILED_ATTEMPTS`. Refresh flow never triggers CAPTCHA, so compromised tokens can be replayed silently until expiry (2d / 30d windows).

## 3. Success Criteria

1. **Security**: stolen refresh tokens must become useless after first replay; suspicious refresh attempts trigger CAPTCHA and security events.
2. **Observability**: every rotation, forced CAPTCHA, or anomaly is logged via `security_events` and rate-limit functions.
3. **UX**: happy-path refresh remains transparent (<250 ms) and preserves "stay signed in" semantics.
4. **Recoverability**: users can self-heal by passing Turnstile or revoking sessions; support can audit via tables/logs.

## 4. Data Model Changes

| Table                         | Change                                                                                                                                                                                                                      | Rationale                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.auth_sessions`        | Add `stay_connected BOOLEAN DEFAULT false` (if missing in prod), `rotation_count INTEGER DEFAULT 0`, `refresh_nonce UUID DEFAULT gen_random_uuid()`, `email TEXT`, `anomaly_reason TEXT`, `captcha_verified_at TIMESTAMPTZ` | Track session duration preference, monitor unusual rotation volume, correlate Supabase session vs. managed refresh token, and persist normalized email for CAPTCHA enforcement. |
| `public.captcha_requirements` | Add `reason TEXT`, `device_id TEXT`, `ip_address TEXT`                                                                                                                                                                      | Existing migration already has `reason`; extend index to include device/IP to scope requirements more granularly.                                                               |
| `public.security_events`      | No schema change; ensure `event_data` captures anomaly metadata.                                                                                                                                                            |

> _Note_: Verify the latest migration (20251020140842…) before applying new DDL to avoid dropping the table again.

## 5. Token Lifecycle Design

### 5.1 Login (`enhanced-login`)

1. Run Turnstile iff `captcha_requirements` says required for email/device/IP.
2. After Supabase `signInWithPassword`, generate 256-bit refresh string (`managed_refresh_token`).
3. Hash token (`token_hash`) and insert into `auth_sessions` with:
   - `expires_at = now + (stayConnected ? 30d : 2d)`
   - `refresh_nonce = uuid generated at insert`
   - `rotation_count = 0`
   - `anomaly_reason = NULL`, `captcha_verified_at = now` if CAPTCHA was solved.
4. Enforce `SESSION_MAX_PER_USER` by revoking oldest rows (set `revoked_at`).
5. Return:

```json
{
  "session": SupabaseSession,
  "refreshToken": managed_refresh_token,
  "stayConnected": boolean,
  "expiresAt": ISO8601,
  "requiresCaptcha": false
}
```

### 5.2 Refresh (`refresh-session`)

1. **Basic validation**
   - Require token, hash, lookup `auth_sessions` where hash matches and `revoked_at IS NULL` and `expires_at > now`.
   - Reject if `last_refreshed_at` within `REFRESH_MIN_ROTATION_INTERVAL` (1 min) to thwart rapid churn → log security event `refresh_too_soon`.
2. **Anomaly detection**
   - Compare `device_id`, `user_agent`, `ip` from request vs stored row.
   - If mismatch on two or more attributes OR rotation count > 20 in 24h, mark `anomaly_reason` and require Turnstile before rotating.
   - If Turnstile required but no valid `captchaToken`, respond `CAPTCHA_REQUIRED` and insert/refresh `captcha_requirements` row keyed by email+device.
3. **Turnstile validation** (if forced)
   - Verify token via `verifyCaptcha`. On success, set `captcha_verified_at = now` and clear `anomaly_reason` for the session.
4. **Single-use rotation**
   - Generate new refresh token, hash it.
   - Update the same session row (`UPDATE auth_sessions SET token_hash = :newHash, last_refreshed_at = now, rotation_count = rotation_count + 1, expires_at = now + TTL`).
   - Store previous hash in `security_events` for traceability.
   - Return new token + expiry; client overwrites `localStorage`.
5. **Replay handling**
   - If provided token hash is absent (likely already rotated or revoked), log `refresh_replay_detected`, require CAPTCHA, and optionally revoke all sessions for that device.

### 5.3 Session Revocation

- `revoke-session`/`revoke-all-sessions` already set `revoked_at`. New flow also clears `captcha_requirements` rows tied to the same device to avoid stale CAPTCHA requirements once compromised sessions are removed.

## 6. Rate Limiting & Turnstile Coupling

| Vector              | Detection                                                                                        | Mitigation                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Rapid refresh churn | `rotation_count` vs time window, `REFRESH_MIN_ROTATION_INTERVAL` breach                          | Return 429, set CAPTCHA requirement, log `refresh_rate_limit` event.         |
| Device/IP mismatch  | Compare metadata vs. stored row                                                                  | Force Turnstile; on failure log `refresh_device_mismatch`.                   |
| Replay              | Missing session row, revoked token, or `last_refreshed_at` newer than request timestamp estimate | Revoke entire device sessions, require CAPTCHA, alert via `security_events`. |

The existing `rate-limit` edge function already supports arbitrary `action` keys. We will add:

- `auth_refresh` (userId/email + IP) – limit to 30 refreshes / 15 min.
- `captcha_challenge` – limit Turnstile challenges to prevent DoS.

## 7. API Contract Updates

### Request Body Additions

```ts
interface RefreshSessionBody {
  refreshToken: string;
  captchaToken?: string; // optional unless server demands
  sessionMetadata?: {
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    stayConnected?: boolean;
  };
}
```

### Response Variants

| Case             | Status | Body                                                                                      |
| ---------------- | ------ | ----------------------------------------------------------------------------------------- |
| Success          | 200    | `{ refreshToken, expiresAt, stayConnected, requiresCaptcha: false }`                      |
| CAPTCHA required | 403    | `{ error: 'CAPTCHA_REQUIRED', messageKey: 'auth.captcha_failed', requiresCaptcha: true }` |
| Replay / Revoked | 401    | `{ error: 'INVALID_REFRESH_TOKEN', messageKey: 'auth.session_invalid' }`                  |
| Rate limited     | 429    | `{ error: 'RATE_LIMIT', retryAfter }`                                                     |

Frontend hooks already bubble `error` + `messageKey`. The new `CaptchaChallengeContext` renders a reusable modal (via `CaptchaChallengeDialog`) and hands `useAuthRefresh` / `useEnhancedAuth` a promise that resolves with the Turnstile token so we can retry rotations seamlessly.

## 8. Logging & Telemetry

- `log_security_event` RPC invoked for:
  - `refresh_success` (metadata: sessionId, rotationCount, ttl).
  - `refresh_replay_detected` (metadata: providedHash, deviceMismatch, ip).
  - `refresh_captcha_required` / `refresh_captcha_passed`.
  - `refresh_rate_limited`.
- Observability hook already logs warnings/errors; enhance payload to include `requiresCaptcha` so FE analytics know when users get challenged.

## 9. Implementation Plan (maps to repo TODOs)

1. **Design doc (this file)** ✅ once merged.
2. **Migrations**
   - Add columns/indexes described in Section 4.
   - Add helper SQL functions: `mark_captcha_requirement(_email, _device_id, _reason)` and `clear_captcha_requirement(_email, _device_id)` to keep logic tidy.
3. **Edge Function Updates**
   - Modularize validation (helpers: `loadSessionByToken`, `shouldForceCaptcha`, `rotateRefreshToken`).
   - Invoke new rate-limit actions.
   - Update responses to include `requiresCaptcha` flag.
4. **Frontend Updates**
   - Add `CaptchaChallengeContext` + `CaptchaChallengeDialog` to centralize the Turnstile prompt.
   - `useAuthRefresh`: when `CAPTCHA_REQUIRED`, open the modal and send `captchaToken` on retry.
   - `useEnhancedAuth.rotateCurrentSession`: same handling for manual rotation button.
5. **Tests**
   - Unit tests for helper functions (e.g., `shouldForceCaptcha`).
   - Vitest coverage for `useAuthRefresh` + `useEnhancedAuth` to assert captcha retry/dismissal flows.
   - Integration via Supabase CLI + Vitest hitting edge function with mocked requests.
   - E2E via Playwright: simulate failed refresh leading to CAPTCHA challenge.
6. **Docs**
   - Update `docs/AUTH_SECURITY_COMPLETE.md`, `README_AUTH.md`, and auth testing guides/checklists with the new CaptchaChallenge flow.

## 10. Risks & Mitigations

| Risk                                                                  | Impact             | Mitigation                                                                                                                    |
| --------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Legitimate IP change triggers CAPTCHA too often                       | Medium UX friction | Set sensible thresholds (require mismatch on >=2 signals) and allow remembered success (`captcha_verified_at` grace for 24h). |
| Clock skew causing premature expiry                                   | Low                | Base TTL on `NOW()` from database via `now()` in SQL updates, not client time.                                                |
| Local storage desync (token replaced but `supabase.auth` session not) | Medium             | After rotation success, call `supabase.auth.refreshSession()` to sync the Supabase-managed cookie/session if needed.          |

## 11. Open Questions

1. Should we rotate the Supabase native refresh token in tandem? Currently only our managed token rotates; Supabase session relies on `supabase.auth.refreshSession()`. We may keep as-is but document dual lifecycle.
2. For forced CAPTCHA on refresh, should FE show inline widget or redirect to `/auth`? Proposed approach: show modal within current view to avoid losing state.
3. Do we need to purge `auth_sessions` rows after `revoked_at`? Cron job exists but confirm schedule.

---

This document unblocks TODO #2 (“Design JWT rotation plan”). Next steps: implement migrations + edge function changes per Sections 4–5.
