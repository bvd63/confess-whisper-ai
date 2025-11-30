# Environment Configuration Guide

This document explains how to configure environment variables for the ConfessAI application.

## Overview

The application uses **Zod validation** for type-safe environment variables. All configuration is managed through:
- `.env` - Local development variables (auto-generated, do not edit manually)
- `.env.example` - Template showing all available variables
- `src/lib/env.ts` - Zod validation schema and type exports

## Required Variables

These variables are **REQUIRED** for the application to start:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

> ⚠️ **Critical**: Without these Supabase credentials, the app will throw an error at startup.

## Optional Variables

These variables enable **additional features** but are not required for basic functionality:

### Stripe VIP Subscriptions

```env
# Frontend (Vite)
VITE_STRIPE_PRICE_VIP_MONTHLY=price_...
VITE_STRIPE_PRICE_VIP_YEARLY=price_...

# Edge Functions / Supabase secrets
STRIPE_PRICE_VIP_MONTHLY=price_...
STRIPE_PRICE_VIP_YEARLY=price_...

# Legacy fallback supported by helpers
PRICE_VIP_MONTHLY=price_...
PRICE_VIP_YEARLY=price_...
```

- **Required for**: VIP subscription checkout and premium features
- **Fallback behavior**: Subscription features will be hidden/disabled
- **How it works**: `supabase/functions/_shared/stripe-config.ts` resolves these in order and caches the result for every edge function
- **Setup guide**: See `STRIPE_SETUP_GUIDE.md`

### OneSignal Push Notifications

```env
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
```

- **Required for**: Push notifications to users
- **Fallback behavior**: Notifications will not be sent
- **Setup**: Configure in Lovable Cloud secrets

### Sentry Error Tracking

```env
VITE_SENTRY_DSN=https://...@sentry.io/...
```

- **Required for**: Production error monitoring
- **Fallback behavior**: Errors logged to console only
- **Setup**: Create Sentry project and add DSN

### Cloudflare Turnstile

```env
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

- **Required for**: CAPTCHA on forms
- **Fallback behavior**: Forms work without CAPTCHA
- **Setup**: Register at Cloudflare Turnstile

### Support Inbox + Resend Email

```env
# Supabase Edge Function secrets (Lovable Cloud)
RESEND_API_KEY=re_your_key
SUPPORT_EMAIL=support@confessai.com
SUPPORT_FROM_EMAIL="ConfessAI Support <support@confessai.com>"
```

- **Required for**: `/contact-support` form submissions
- **Fallback behavior**: Requests fail with "Unable to send" and users are prompted to retry
- **Setup**: Create a [Resend](https://resend.com) API key, verify your sending domain, then store the secrets in Lovable Cloud → Project → Settings → Cloud → Secrets
- **Notes**: `SUPPORT_FROM_EMAIL` must match a verified sender identity. `SUPPORT_EMAIL` is where support tickets are delivered and can be the same as the `from` address.

## Environment Validation

The application validates environment variables on startup using `src/lib/env.ts`:

```typescript
// Required variables - will throw error if missing
VITE_SUPABASE_URL: z.string().url()
VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20)

// Optional variables - app starts with warnings if missing
VITE_STRIPE_PRICE_VIP_MONTHLY: z.string().optional()
VITE_STRIPE_PRICE_VIP_YEARLY: z.string().optional()
VITE_ONESIGNAL_APP_ID: z.string().optional()
VITE_SENTRY_DSN: z.string().url().optional()
```

### Running Validation Manually

```bash
npm run check:env
```

This script validates all environment variables and outputs:

- ✅ Valid configuration
- ❌ Missing required variables
- ⚠️ Missing optional variables

## CI/CD Environment Variables

The GitHub Actions CI pipeline automatically validates environment variables on every push:

```yaml
- name: Check environment variables
  run: npm run check:env
```

## Lovable Cloud Integration

All backend secrets are managed through **Lovable Cloud** (Supabase):

1. Navigate to Project → Settings → Cloud → Secrets
2. Add the required secret keys:

    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`
    - `STRIPE_PRICE_VIP_MONTHLY`
    - `STRIPE_PRICE_VIP_YEARLY`
    - (Optional legacy) `PRICE_VIP_MONTHLY` / `PRICE_VIP_YEARLY`
    - `ONESIGNAL_REST_API_KEY`
3. Keep `STRIPE_PRICE_*` values in sync with the frontend `VITE_STRIPE_PRICE_*` entries. The `scripts/check-env.ts` helper fails fast if either set is missing on deploy.

> 💡 **Note**: These backend secrets are separate from frontend environment variables and are only accessible in edge functions.

## Troubleshooting

### "Missing required environment variables" error

**Cause**: Supabase credentials not configured

**Fix**:

1. Check `.env` file contains valid Supabase credentials
2. Ensure credentials match your Lovable Cloud project
3. Restart dev server: `npm run dev`

### Optional features not working

**Cause**: Optional variables not configured

**Fix**:

1. Check which feature is failing (Stripe/OneSignal/Sentry)
2. Add the corresponding environment variable to `.env`
3. Restart dev server

### Environment validation fails in CI

**Cause**: GitHub Actions doesn't have access to secrets

**Fix**:

1. Add secrets to GitHub repository settings
2. Update `.github/workflows/ci.yml` to inject secrets
3. Or use Lovable Cloud deployment (recommended)

## Best Practices

1. **Never commit `.env`** - It's in `.gitignore` for security
2. **Keep `.env.example` updated** - Document all new variables
3. **Use Zod validation** - Always validate in `src/lib/env.ts`
4. **Lovable Cloud for secrets** - Store sensitive keys securely
5. **Fail fast on required vars** - App should not start without critical config

## Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| `MODE` | `development` | `production` |
| Stripe Keys | Test mode (`sk_test_...`) | Live mode (`sk_live_...`) |
| Sentry | Optional | Recommended |
| OneSignal | Optional | Recommended |

## Reference

- Zod validation: `src/lib/env.ts`
- Validation script: `scripts/check-env.ts`
- Usage in code: `import { env } from '@/lib/env'`
- Type-safe access: `env.client.supabaseUrl`
