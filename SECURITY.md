# Security Policy

## Overview

ConfessAI takes security seriously. This document outlines our security practices, implemented protections, and how to report vulnerabilities.

## Edge Function Access Matrix (Backend Hardening 2026-02)

This section is the source of truth for Edge Function exposure, auth mode, and allowed callers.

### Sensitive Functions

| Function | verify_jwt | Allowed Caller | Required Guard | Sensitive Writes |
|---|---|---|---|---|
| `verify-coin-payment` | `true` | Authenticated end-user | JWT + owner check (`session.metadata.user_id == auth user`) | `coin_transactions`, `user_coins` via `award_coins` |
| `verify-coin-purchase` | `true` | Authenticated end-user | JWT + owner check (`session.metadata.user_id == auth user`) | `coin_transactions`, `user_coins` via `award_coins` |
| `verify-subscription-payment` | `true` | Authenticated end-user | JWT + profile owner-only updates | `profiles.subscription_*` |
| `billing-confirm` | `true` | Authenticated end-user | JWT + profile owner-only updates | `profiles.subscription_*` |
| `award-subscription-coins` | `true` | Authenticated user (self) or internal caller | JWT self-check OR `x-internal-secret`; tier/amount computed server-side | `coin_transactions`, `user_coins` via `award_coins` |
| `award-streak-bonus` | `true` | Authenticated user (self) or internal caller | JWT self-check OR `x-internal-secret`; fixed server-side streak reward map | `coin_transactions`, `user_coins` via `award_coins` |
| `send-notification` | `false` | Internal trigger (preferred) or authenticated self-call | `x-internal-secret` OR strict self-ownership check | `analytics_events`, reads notification/profile data |
| `stripe-webhook` | `false` | Stripe only | `stripe-signature` validation + event idempotency (`stripe_events`) | `subscriptions`, `coin_transactions`, `profiles` |
| `stripe-webhook-coins` | `false` | Stripe only | `stripe-signature` validation + coin idempotency check | `coin_transactions`, `user_coins` via `award_coins` |
| `stripe-webhook-subscriptions` | `false` | Stripe only | `stripe-signature` validation | `profiles.subscription_*` |

### Internal/Cron Functions

| Function | verify_jwt | Allowed Caller | Required Guard |
|---|---|---|---|
| `rotate-qotd` | `false` | Internal cron/job | `x-internal-secret` |
| `cleanup-soft-deletes` | `false` | Internal cron/job | `x-internal-secret` |
| `cleanup-auth-data` | `false` | Internal cron/job | `x-internal-secret` |
| `deactivate-expired-flairs` | `false` | Internal cron/job | `x-internal-secret` |
| `expire-boosts` | `false` | Internal cron/job | `x-internal-secret` |

### Global Invariants (Non-Negotiable)

1. No anonymous/public caller can directly modify money/coins/subscriptions for any user.
2. `user_id` is derived from JWT (or from verified Stripe event metadata), never trusted from client body.
3. Coin amounts/tier eligibility are computed server-side.
4. Webhook-only flows must validate Stripe signature before business logic.
5. Internal cron/server jobs must use `x-internal-secret` and never hardcode bearer tokens in SQL.

## Implemented Security Features

### 1. XSS Protection ✅
- **DOMPurify Integration**: All user-generated content is sanitized using DOMPurify
- **Context-Specific Sanitization**:
  - Confessions: Limited HTML formatting (p, br, strong, em)
  - Comments: Plain text only (HTML encoded)
  - Bios: Links and basic formatting allowed
  - Nicknames: Alphanumeric + underscores only

### 2. CSRF Protection ✅
- **Token-Based Protection**: All state-changing operations require CSRF tokens
- **Timing-Safe Comparison**: Prevents timing attacks on token validation
- **Session-Based Storage**: Tokens stored in sessionStorage
- **Automatic Rotation**: Tokens regenerated on authentication changes

### 3. Security Headers ✅
Comprehensive security headers applied to all responses:
- **Content-Security-Policy (CSP)**: Restricts resource loading
- **X-Frame-Options**: Prevents clickjacking (SAMEORIGIN)
- **X-XSS-Protection**: Browser XSS filter enabled
- **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS

### 4. Input Validation ✅
- **Zod Schema Validation**: All API inputs validated with Zod
- **Content Filtering**: 
  - PII detection (emails, phones, SSN, credit cards)
  - SQL injection pattern detection
  - Profanity filtering (EN/ES/DE)
- **Rate Limiting**: Per-user submission limits
- **Length Limits**: All inputs have maximum length constraints

### 5. Authentication & Authorization ✅
- **Supabase Auth**: Secure JWT-based authentication
- **Row Level Security (RLS)**: Database-level access control
- **Session Management**: Automatic token refresh
- **Secure Password Storage**: Handled by Supabase Auth

### 6. Stripe Payment Security ✅
- **Webhook Signature Verification**: All webhooks verified with Stripe signature
- **Idempotency**: Duplicate webhook events prevented
- **Environment Variables**: API keys stored securely
- **PCI Compliance**: Payment processing handled by Stripe (no card data stored)

### 7. Database Security ✅
- **Connection Pooling**: Prevents connection exhaustion
- **Parameterized Queries**: Prevents SQL injection
- **RLS Policies**: Row-level security on all tables
- **Encrypted Connections**: TLS/SSL for all database connections

### 8. API Security ✅
- **CORS Configuration**: Restricted origin policies
- **Rate Limiting**: API endpoint throttling
- **Error Handling**: No sensitive data in error messages
- **Logging**: Security events logged for audit

## Environment Variables

### Client-Safe (VITE_ prefix)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_VIP_MONTHLY=price_...
VITE_STRIPE_PRICE_VIP_YEARLY=price_...
```

### Server-Only (Supabase Secrets)
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
INTERNAL_JOB_SECRET=long-random-secret-for-cron-internal-calls
OPENAI_API_KEY=sk-...
TURNSTILE_SECRET=...
MAPBOX_TOKEN=...
```

### Database Settings used by SQL cron jobs

The hardened SQL migrations call Edge Functions via:

- `current_setting('app.settings.supabase_url', true)` for project URL
- `current_setting('app.settings.internal_job_secret', true)` for the `x-internal-secret` header

Configure these settings in each environment (dev/staging/prod) before enabling jobs.

## Security Best Practices

### For Developers

1. **Never commit secrets**: Use environment variables
2. **Validate all inputs**: Client + server side
3. **Sanitize user content**: Use provided sanitization utilities
4. **Use CSRF tokens**: For all state-changing operations
5. **Apply security headers**: Use provided header utilities
6. **Test security**: Run security tests before deployment

### For Users

1. **Use strong passwords**: Minimum 8 characters, mix of types
2. **Enable 2FA**: If/when available
3. **Report suspicious activity**: Use security email
4. **Keep browser updated**: Latest security patches
5. **Verify HTTPS**: Check for lock icon in browser

## Vulnerability Reporting

### Reporting Process

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. **Email**: security@confessai.app (if configured)
3. **Include**: 
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 48 hours
- **Fix Development**: Within 7 days (critical), 14 days (high), 30 days (medium/low)
- **Disclosure**: After fix deployed + 7 days

### Severity Levels

- **CRITICAL**: Immediate data breach risk, RCE, authentication bypass
- **HIGH**: XSS, CSRF, SQL injection, privilege escalation
- **MEDIUM**: Information disclosure, denial of service
- **LOW**: Minor information leaks, non-critical bugs

## Security Testing

### Automated Tests

```bash
# Run all tests
npm run test

# Security-specific tests
npm run test tests/security/

# Integration tests
npm run test tests/integration/

# E2E tests
npm run test:e2e

# Edge function hardening tests added in 2026-02
npm run test:integration -- tests/integration/edge-function-security.test.ts tests/integration/webhook-security.test.ts tests/integration/rls-invariants.test.ts
```

### Manual Testing Checklist

- [ ] XSS: Try injecting `<script>alert('XSS')</script>` in all inputs
- [ ] CSRF: Submit forms without CSRF token
- [ ] SQL Injection: Try `'; DROP TABLE users; --` in inputs
- [ ] Authentication: Test unauthorized access to protected routes
- [ ] Rate Limiting: Test rapid submissions
- [ ] File Upload: Test malicious file uploads (if applicable)

## Incident Response

### Detection
- Monitor error logs for suspicious patterns
- Track failed authentication attempts
- Alert on unusual API usage

### Response
1. **Identify**: Determine scope and impact
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove vulnerability
4. **Recover**: Restore normal operations
5. **Learn**: Update security measures

### Communication
- Notify affected users within 72 hours
- Provide clear guidance on protective actions
- Publish security advisory (non-critical issues)

## Compliance

### GDPR Compliance
- User data stored in EU regions (configurable)
- Right to access, rectify, delete personal data
- Data processing transparency
- Consent management

### CCPA Compliance
- California consumer rights supported
- Data collection disclosure
- Opt-out mechanisms

## Security Roadmap

### Completed ✅
- XSS Protection (DOMPurify)
- CSRF Protection (Token-based)
- Security Headers (CSP, HSTS, etc.)
- Input Validation (Zod + patterns)
- Stripe Webhook Security
- Database Connection Pooling
- Rate Limiting

### Planned 🔄
- Two-Factor Authentication (2FA)
- Biometric Authentication (mobile)
- Advanced Rate Limiting (Redis-based)
- Security Audit Logging Dashboard
- Penetration Testing (quarterly)
- Bug Bounty Program

## Dependencies

### Security-Critical Dependencies
- `dompurify`: XSS sanitization
- `@supabase/supabase-js`: Authentication & database
- `stripe`: Payment processing
- `zod`: Input validation

### Update Policy
- Critical security patches: Within 24 hours
- High severity updates: Within 1 week
- Regular updates: Monthly review

## Contact

- **Security Issues**: security@confessai.app
- **General Support**: support@confessai.app
- **Documentation**: https://docs.confessai.app

## Acknowledgments

We thank the security research community for responsible disclosure practices and helping keep ConfessAI secure.

---

**Last Updated**: 2026-02-15
**Version**: 2.1.0
