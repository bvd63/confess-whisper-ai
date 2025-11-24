# Supabase RLS Audit

_Last updated: 2025-11-23_

This document enumerates the Supabase tables and Edge functions that ConfessAI relies on, together with the row-level security (RLS) expectations we must keep enforced in the hosted project. No SQL changes are shipped from this repository, so every checklist item below needs to be verified and enforced directly inside Supabase.

## Table-Level Expectations

| Table | Access Patterns (code refs) | Required RLS / Notes |
| ----- | --------------------------- | -------------------- |
| `profiles` | `src/pages/Profile.tsx`, `src/hooks/useGDPR.ts`, `src/services/onesignal.ts` | End-users must only `select`/`update` rows where `user_id = auth.uid()`. Moderators may need read-only access via a dedicated role. Service functions that sync Stripe IDs must run with the service role only. |
| `confessions` | CRUD via Supabase client, moderation via `supabase/functions/report-confession`, GDPR export (`useGDPR`) | Enforce owner-only access (`user_id = auth.uid()`) for select/update/delete. Permit insert for authenticated users that pass business rules. Moderation/service roles may update `is_reported` and other flags. |
| `confession_reports` | `supabase/functions/report-confession` | Only service role inserts/reads. Frontend never talks to table directly. Ensure reporters cannot read other reporters' submissions. |
| `comments` | `src/hooks/useGDPR.ts`, feed components | Policies should ensure `author_id = auth.uid()` for mutations. Reads can be public but must filter on `confession_id` if sensitive fields exist. |
| `messages` | `src/hooks/useGDPR.ts`, messaging UI | Require `(sender_id = auth.uid()) OR (receiver_id = auth.uid())` for all operations. Deny inserts that spoof `sender_id`. |
| `notifications` | `src/hooks/useGDPR.ts`, notification feeds | RLS must enforce `user_id = auth.uid()` for select/update/delete. Edge functions that broadcast should always insert with service role. |
| `user_preferences` | `src/hooks/useGDPR.ts`, settings flows | Only owner can read/write. This table includes push tokens, so reject anonymous access. |
| `user_likes`, `bookmarks` | `src/hooks/useConfessionInteractions.ts` | Enforce owner-only access because the UI queries by `user_id`. Prevent malicious deletes on other users by ensuring `auth.uid()` match in policies. |
| `user_follows` | `src/hooks/useGDPR.ts` | Allow a user to read rows where they are follower or following, but only mutate rows where they are `follower_id`. |
| `user_badges`, `user_streaks`, `user_coins` | `useGDPR`, rewards UI, `src/hooks/useCoins.ts` | Require owner-only read access. Inserts/updates typically originate from Supabase Functions (service role) when awarding streaks/coins/badges. |
| `coin_transactions`, `coin_packages` | `src/pages/TestPayments.tsx`, `supabase/functions/create-coin-checkout` | Transactions must be readable only by the owning `user_id`. Packages can stay public read-only with insert/update restricted to admins. |
| `subscriptions` | Stripe webhook + billing functions | Only service role should insert/update subscription rows. Users may `select` rows filtered by their `user_id` to render plan state. |
| `moderation_logs` | `src/pages/Admin.tsx` | Restrict `select`/`insert` to admin role via Supabase groups. Never expose to standard users. |
| `analytics_events` | `src/lib/analytics.ts`, `src/lib/observability.ts` | Inserts happen directly from the client, so enforce RLS that `auth.uid() = new.user_id`. Reading should be limited to service/admin contexts only. |
| `confession_images`, `attachments` (if present) | Referenced by `ImageUpload` | Make sure storage bucket policies mirror table rules: only owners or moderators can read originals. |
| `rate_limit_events` / `log_security_event` RPC tables | Used via Supabase RPC inside functions | Keep them service-role only; no direct client access. |

### Additional tables spotted in code
- `coin_packages`, `coin_awards`, `user_rewards` (check migrations) should be admin/service-role managed.
- `security_events` logged via `log_security_event` RPC must be restricted to service role writers and admin readers.
- `vip_audit`, `subscription_audit` tables (if present) should be read-only for finance/admin.

## Edge Functions & Service Role Usage

| Function | Critical Tables / Actions | Security Controls to keep verified |
| -------- | ------------------------ | ---------------------------------- |
| `enhanced-auth` | Reads/writes `profiles`, issues password reset links, touches `user_preferences` | Requires valid Supabase session via `Authorization` header. Rate-limit sensitive endpoints. Ensure function only runs with `createServiceClient()` (service key) and never exposes secrets. |
| `manage-subscription` / `manage-subscription-v2` / `subscription-upgrade` / `billing-*` | Mutate `subscriptions`, Stripe customer metadata | Must require `EDGE_INTERNAL_TOKEN` header (see `ensureEdgeAuthorized`). Verify all deployed routes enforce the header before using service role operations. |
| `ai-confession-response` | Reads confessions, writes AI replies | Accepts user session to scope data. Confirm RLS on `confessions` still applies even though function uses service client. |
| `report-confession` | Inserts `confession_reports`, updates `confessions` flags, logs security events | Requires authenticated Supabase session. Also invokes `rate-limit` function with `EDGE_INTERNAL_TOKEN`, so ensure that function validates the token before operating on shared counters. |
| `send-notification` | Triggers OneSignal/Push | Only callable with edge token. Keeps notification fan-out outside of client trust boundary. |
| `rate-limit` | Persists counters (`rate_limit_events`) | Must be edge-protected because it trusts body parameters like `userId`/`ip`. |

## Potential Gaps / TODOs

1. **Verify live RLS matches the expectations above.** The code base assumes `user_id = auth.uid()` policies exist for `confessions`, `comments`, `messages`, `notifications`, `user_preferences`, `user_coins`, `coin_transactions`, `user_badges`, `user_streaks`, `user_follows`, `user_likes`, and `bookmarks`. Confirm policies inside Supabase and document exceptions.
2. **Moderation/Admin tables** (`moderation_logs`, `analytics_events`, `security_events`) need explicit admin roles. If RLS is currently disabled, create policies that check `auth.jwt() ->> 'role' = 'admin'` or rely on Postgres roles.
3. **Service role functions bypass RLS** by design. Ensure every deployed Edge function that calls `createServiceClient()` either validates `Authorization` (user session) or the `x-edge-token`. Perform periodic key rotations for `EDGE_INTERNAL_TOKEN`.
4. **Client-side inserts into `analytics_events` and similar tables** rely entirely on RLS to prevent spoofing. Consider server-side relays or validation (e.g., verify payload schema or throttle). Add TODO in Supabase to enable `auth.uid() = new.user_id` checks if missing.
5. **Storage buckets** (images, attachments, profile media) were not covered in this audit. Align storage policies with their backing tables so deleting a confession also revokes access to its assets.
6. **GDPR export/delete (`src/hooks/useGDPR.ts`)** performs cascading deletes using the signed-in user's `userId` value. Verify corresponding tables reject deletes where `auth.uid()` does not match, otherwise a tampered client could purge someone else's data.
7. **Stripe test helpers (`src/pages/TestPayments.tsx`)** rely on reading `user_coins`, `coin_transactions`, etc. Confirm those tables enforce owner-only access before enabling the page outside of privileged roles.

 Document owners should re-run this audit whenever migrations introduce new tables or Supabase Edge functions.

