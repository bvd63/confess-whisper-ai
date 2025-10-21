# Environment Variables Configuration Guide

## Overview

This guide covers all environment variables needed for ConfessAI in development and production.

---

## 📋 Quick Setup Checklist

**For Development:**
- ✅ Supabase URL and Anon Key (required)
- ⚠️ Stripe Publishable Key (optional - for testing payments)
- ⚠️ Turnstile Site Key (optional - uses test key if not set)
- ⚠️ Mapbox Token (optional - for location features)

**For Production:**
- ✅ Supabase URL and Anon Key (required)
- ✅ Stripe Publishable Key (required - for payments)
- ✅ Turnstile Site Key (recommended - for bot protection)
- ⚠️ Mapbox Token (optional - for location features)

---

## 1. Supabase Configuration

### Required Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Where to Find These Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `VITE_SUPABASE_ANON_KEY`
   - (Note: `VITE_SUPABASE_PUBLISHABLE_KEY` is the same as `VITE_SUPABASE_ANON_KEY`)

### Security Notes

- ✅ Safe to expose in client-side code (Vite bundles these)
- ✅ Protected by Row Level Security (RLS) policies
- ❌ Never use `service_role` key in frontend!

---

## 2. Stripe Configuration

### Required Variable

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Test mode
# or
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # Production
```

### Setup Instructions

See comprehensive guide: [`docs/STRIPE_SETUP_GUIDE.md`](./STRIPE_SETUP_GUIDE.md)

**Quick Steps:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. Copy **Publishable key**
   - Test mode: starts with `pk_test_`
   - Live mode: starts with `pk_live_`
4. Paste into `.env` as `VITE_STRIPE_PUBLISHABLE_KEY`

### Backend Configuration (Supabase Secrets)

The following must be set in Supabase Dashboard → **Edge Functions** → **Secrets**:

```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # from Stripe webhook setup
```

### Product Configuration

Price IDs are already configured in `src/lib/stripe-config.ts`:
- `premium_monthly`: Monthly premium subscription
- `premium_yearly`: Yearly premium subscription
- `vip_monthly`: Monthly VIP subscription
- `vip_yearly`: Yearly VIP subscription

You need to create these products in Stripe Dashboard and update the Price IDs.

---

## 3. Cloudflare Turnstile (CAPTCHA)

### Required Variable

```bash
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA... # Production site key
```

### Setup Instructions

See comprehensive guide: [`docs/TURNSTILE_CAPTCHA_SETUP.md`](./TURNSTILE_CAPTCHA_SETUP.md)

**Quick Steps:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Click **Add Site**
4. Configure:
   - **Site name**: ConfessAI Production
   - **Domain**: your-domain.com (or localhost for testing)
   - **Widget mode**: Managed (recommended)
5. Copy **Site Key** → `VITE_TURNSTILE_SITE_KEY`
6. Copy **Secret Key** → Add to Supabase Secrets as `TURNSTILE_SECRET`

### Backend Configuration (Supabase Secrets)

```bash
TURNSTILE_SECRET=0x4AAAAAAA... # Secret key from Turnstile
```

### Development Testing

If not set, the app uses a test key that always passes:
```bash
# Test key (auto-used if VITE_TURNSTILE_SITE_KEY is empty)
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

### Current Status

CAPTCHA is **implemented but disabled** in the code:
- Frontend: Widget shows, validation commented out (Auth.tsx lines 81-83)
- Backend: Server-side validation ready in `enhanced-auth` Edge Function
- To enable: Uncomment validation + set production keys

---

## 4. Mapbox Configuration (Optional)

### Optional Variable

```bash
VITE_MAPBOX_TOKEN=pk.eyJ1... # Your Mapbox access token
```

### Setup Instructions

See detailed guide: [`docs/MAPBOX_SETUP.md`](./MAPBOX_SETUP.md)

**Quick Steps:**
1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Navigate to **Access tokens**
3. Create new token or copy existing public token
4. Paste into `.env` as `VITE_MAPBOX_TOKEN`

### Features Using Mapbox

- Location picker for confessions
- Nearby confessions map view
- Reverse geocoding (coordinates → address)

### Fallback Behavior

If not set, a fallback token is used (limited functionality).

---

## 5. AI Configuration (Backend Only)

These are configured in Supabase Secrets, **not** in frontend `.env`:

```bash
OPENAI_API_KEY=sk-... # For AI-powered features
ANTHROPIC_API_KEY=sk-ant-... # Alternative AI provider (if used)
```

### Where to Add

1. Supabase Dashboard → Your Project
2. **Edge Functions** → **Secrets**
3. Add each secret with the appropriate value

### Features Using AI

- AI confession responses (`ai-confession-response` Edge Function)
- Content moderation (`ai-moderation`, `enhanced-moderation`)
- Insight generation
- Polish/improve confession text

---

## 6. Complete .env Template

Copy `.env.example` to `.env` and fill in your values:

```bash
# ===== REQUIRED =====
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
VITE_SUPABASE_ANON_KEY=eyJhbG...

# ===== RECOMMENDED FOR PRODUCTION =====
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...

# ===== OPTIONAL =====
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

---

## 7. Supabase Secrets (Backend Configuration)

These are set in Supabase Dashboard, not in local `.env`:

### Required for Production

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Turnstile CAPTCHA
TURNSTILE_SECRET=0x4AAAAAAA...

# AI (at least one)
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

### How to Add Secrets

1. Supabase Dashboard → Your Project
2. **Settings** → **Edge Functions**
3. Scroll to **Secrets** section
4. Click **Add new secret**
5. Enter:
   - **Name**: `STRIPE_SECRET_KEY` (example)
   - **Value**: `sk_live_...` (your secret value)
6. Click **Save**
7. Repeat for all secrets

---

## 8. Environment-Specific Configuration

### Development (.env.local)

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Optional for local testing
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA # Test key
```

### Staging (.env.staging)

```bash
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA... # Production key for testing
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

### Production (.env.production)

```bash
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAA...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

---

## 9. Validation & Testing

### Check Current Configuration

Visit `/test` page in your app to see:
- Which environment variables are set
- Database connection status
- Edge Functions connectivity

### Verify Each Service

**Supabase:**
```bash
# Should work immediately after setting keys
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/
```

**Stripe:**
```bash
# Test publishable key format
echo $VITE_STRIPE_PUBLISHABLE_KEY | grep -E "^pk_(test|live)_"
```

**Turnstile:**
- Navigate to `/auth` in your app
- Switch to signup mode
- CAPTCHA widget should appear at bottom
- Complete it and check browser console for token

**Mapbox:**
- Navigate to a page with location picker
- Should show map if token is valid
- Falls back to basic input if token missing

---

## 10. Security Best Practices

### ✅ DO:
- Use `.env.local` for local development (gitignored)
- Store production secrets in Supabase Dashboard
- Rotate secrets periodically (every 90 days)
- Use test keys for development/staging
- Enable CAPTCHA in production
- Use HTTPS in production

### ❌ DON'T:
- Commit `.env` files to Git
- Share secrets in Slack/Discord/email
- Use production secrets in development
- Expose `service_role` keys in frontend
- Disable CAPTCHA in production
- Use test mode Stripe in production

---

## 11. Troubleshooting

### "Cannot connect to Supabase"
- ✅ Check `VITE_SUPABASE_URL` is correct
- ✅ Verify `VITE_SUPABASE_ANON_KEY` matches dashboard
- ✅ Ensure Supabase project is not paused
- ✅ Check browser console for specific errors

### "Stripe checkout not working"
- ✅ Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- ✅ Check `STRIPE_SECRET_KEY` in Supabase Secrets
- ✅ Ensure Price IDs match Stripe Dashboard
- ✅ Check Edge Function logs for errors

### "CAPTCHA verification failed"
- ✅ Confirm `VITE_TURNSTILE_SITE_KEY` is correct
- ✅ Verify `TURNSTILE_SECRET` in Supabase Secrets
- ✅ Check domain matches Turnstile configuration
- ✅ Enable in Auth.tsx (uncomment lines 81-83)

### "Mapbox map not loading"
- ✅ Check `VITE_MAPBOX_TOKEN` is valid
- ✅ Verify token has correct scopes
- ✅ Check browser console for API errors
- ✅ Confirm Mapbox account is active

---

## 12. Deployment Checklist

Before deploying to production:

- [ ] All required environment variables set
- [ ] Stripe keys switched from test to live mode
- [ ] Turnstile configured for production domain
- [ ] Supabase secrets configured (backend)
- [ ] Edge Functions deployed with secrets
- [ ] CAPTCHA enabled in Auth.tsx
- [ ] HTTPS enabled
- [ ] Domain configured in all services
- [ ] Test complete signup/payment flow
- [ ] Monitor error logs for 24 hours

---

## 13. Related Documentation

- [Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)
- [Turnstile CAPTCHA Setup](./TURNSTILE_CAPTCHA_SETUP.md)
- [Mapbox Setup](./MAPBOX_SETUP.md)
- [Production Readiness](./PRODUCTION_READINESS.md)
- [Go-Live Checklist](./go-live-checklist.md)

---

**Last Updated:** 2025-10-21  
**Status:** Production Ready ✅
