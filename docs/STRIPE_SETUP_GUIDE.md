# Stripe Setup Guide

Complete guide to configure Stripe payments for VIP subscriptions in ConfessAI.

## Prerequisites

- ✅ Lovable Cloud enabled (Supabase backend)
- ✅ Stripe account (test or live mode)
- ✅ Basic understanding of subscription pricing

## Step 1: Create Stripe Products

### 1.1 VIP Monthly Subscription

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add Product"**
3. Configure:
   - **Name**: `VIP Monthly`
   - **Description**: `Monthly VIP subscription with premium features`
   - **Pricing**: Recurring
   - **Price**: `$9.99` (or your preferred amount)
   - **Billing period**: `Monthly`
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_...`)

### 1.2 VIP Yearly Subscription

1. Click **"+ Add Product"** again
2. Configure:
   - **Name**: `VIP Yearly`
   - **Description**: `Yearly VIP subscription with premium features (save 20%)`
   - **Pricing**: Recurring
   - **Price**: `$95.88` (or your preferred amount)
   - **Billing period**: `Yearly`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_...`)

## Step 2: Configure Environment Variables

### Option A: Lovable Cloud Secrets (Recommended)

1. Open your project in Lovable
2. Go to **Settings → Cloud → Secrets**
3. Add these secrets:

```env
# Stripe backend credentials
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_TOLERANCE_SECONDS=300

# Backend price allowlist (enforced by every edge function)
PRICE_VIP_MONTHLY=price_...
PRICE_VIP_YEARLY=price_...
PRICE_PREMIUM_MONTHLY=
PRICE_PREMIUM_YEARLY=

# Frontend price IDs (safe to expose)
VITE_STRIPE_PRICE_VIP_MONTH_ID=price_...
VITE_STRIPE_PRICE_VIP_YEAR_ID=price_...
```

> 🔐 Supabase edge functions enforce a backend allowlist for _every_ price-changing
> action. Mirror your VIP (and any premium) price IDs into the `PRICE_*` secrets
> so `create-checkout`, `subscription-upgrade`, `subscription-downgrade`, and
> portal flows reject tampered requests.

### Option B: Local Development

Add to your `.env` file:

```env
VITE_STRIPE_PRICE_VIP_MONTH_ID=price_...
VITE_STRIPE_PRICE_VIP_YEAR_ID=price_...
```

> ⚠️ **Note**: Backend secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
> all `PRICE_*` values) live in Lovable Cloud only. Keep `.env` limited to
> `VITE_*` values for local dev builds.

## Step 3: Set Up Stripe Webhooks

Webhooks allow Stripe to notify your backend when subscriptions are created/updated.

### 3.1 Create Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **"Add endpoint"**
5. **Copy the Signing Secret** (starts with `whsec_...`)
6. Add to Lovable Cloud secrets as `STRIPE_WEBHOOK_SECRET`

### 3.2 Enforce Signature Freshness

1. Keep webhook replay attacks in check by limiting how long signatures stay
   valid.
2. Set `STRIPE_WEBHOOK_TOLERANCE_SECONDS` (default 300) in Lovable Cloud
   secrets if you need a custom window.
3. Stripe recommends keeping this value low (5 minutes or less) unless you
   expect networking delays.
4. After changing the tolerance, redeploy the edge function so the new limit is
   enforced.

## Step 4: Test the Integration

### 4.1 Test Checkout Flow

1. Rebuild your app in Lovable
2. Navigate to the subscription page
3. Click **"Upgrade to VIP"**
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. Complete checkout
6. Verify:
   - ✅ Redirected to success page
   - ✅ User status updated to VIP
   - ✅ Access to premium features

### 4.2 Test Webhook Delivery

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Verify webhook receives 200 OK response

### 4.3 Check Logs

Check edge function logs in Lovable:

1. Open **Cloud → Edge Functions**
2. Select `stripe-webhook` or `create-checkout`
3. Review logs for errors

### 4.4 Monitoring & Automated Tests

Run the targeted Vitest suites any time you touch Stripe secrets or migrations:

```bash
pnpm vitest run tests/integration/stripe-price-allowlist.test.ts tests/integration/stripe-monitoring.test.ts tests/integration/stripe-webhook.test.tsx
```

- `stripe-price-allowlist` now asserts every backend function honors the allowlist guard and emits monitoring metadata when a price ID is missing or tampered.
- `stripe-monitoring` validates the structured log envelopes shared by the webhook, checkout, manage-subscription, and sync functions.
- `stripe-webhook` covers signature verifications, duplicate detection, and the negative-invoice circuit breaker.

## Step 5: Switch to Production Mode

### 5.1 Create Live Products

Repeat **Step 1** in Stripe **Live Mode**:

1. Toggle from "Test mode" to "Live mode" in Stripe Dashboard
2. Create new VIP Monthly and VIP Yearly products
3. Copy the **live mode** Price IDs

### 5.2 Update Production Secrets

Update Lovable Cloud secrets with live values:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
PRICE_VIP_MONTHLY=price_live_...
PRICE_VIP_YEARLY=price_live_...
PRICE_PREMIUM_MONTHLY=
PRICE_PREMIUM_YEARLY=
VITE_STRIPE_PRICE_VIP_MONTH_ID=price_live_...
VITE_STRIPE_PRICE_VIP_YEAR_ID=price_live_...
```

### 5.3 Create Live Webhook

Create a new webhook endpoint in **Live Mode** with the same configuration as
Step 3.

### 5.4 Test with Real Card

⚠️ Test with a **small amount** first:

1. Temporarily set price to $0.50
2. Test with real card
3. Verify everything works
4. Reset to production pricing

## Troubleshooting

### "Price ID missing" warning

**Cause**: Environment variables not configured

**Fix**:

1. Verify Price IDs added to Lovable Cloud secrets
2. Rebuild app after adding secrets
3. Check `npm run check:env` shows no warnings

### Checkout button disabled

**Cause**: Stripe Price IDs not loaded

**Fix**:

1. Check browser console for errors
2. Verify `.env` contains `VITE_STRIPE_PRICE_VIP_MONTH_ID`
3. Verify Supabase secrets contain `PRICE_VIP_MONTHLY`
4. Hard refresh browser (Ctrl+Shift+R)

### Checkout fails with error

**Cause**: Invalid Stripe secret key or price ID

**Fix**:

1. Verify secret key matches test/live mode
2. Confirm price IDs exist in Stripe Dashboard
3. Check edge function logs for specific error

### User not upgraded after payment

**Cause**: Webhook not delivered or failed

**Fix**:

1. Check webhook logs in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` matches webhook signing secret
3. Test webhook delivery manually from Stripe Dashboard

### Webhook returns 400 error

**Cause**: Signature verification failed

**Fix**:

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure webhook URL is correct
3. Check edge function logs for detailed error

## Price ID Reference

### Test Mode (Development)

```text
Monthly: price_1A2B3C4D5E6F7G8H9I0J1K2L
Yearly:  price_2M3N4O5P6Q7R8S9T0U1V2W3X
```

### Live Mode (Production)

```text
Monthly: price_live_A1B2C3D4E5F6G7H8I9J0K1L2
Yearly:  price_live_M3N4O5P6Q7R8S9T0U1V2W3X4
```

## Where Price IDs Are Used

### Frontend (Public)

- `src/lib/stripe-config.ts` - Configuration file
- `src/components/SubscriptionPlansGrid.tsx` - Plan display
- Environment: `VITE_STRIPE_PRICE_VIP_MONTH_ID`, `VITE_STRIPE_PRICE_VIP_YEAR_ID`

### Backend (Private)

- `supabase/functions/create-checkout/index.ts` - Checkout session creation
- `supabase/functions/subscription-upgrade/index.ts` - Plan upgrades
- `supabase/functions/subscription-downgrade/index.ts` - Downgrades + portal sync
- `supabase/functions/billing-*` helpers - Billing confirmations
- Environment: `PRICE_VIP_MONTHLY`, `PRICE_VIP_YEARLY`, optional `PRICE_PREMIUM_*`

> 💡 **Security Note**: Price IDs are **public identifiers** and safe to expose
> client-side. Secret keys must remain in backend only.

## Best Practices

1. **Start with Test Mode** - Always test thoroughly before going live
2. **Monitor Webhooks** - Set up alerts for failed webhook deliveries
3. **Handle Failures Gracefully** - Show clear error messages to users
4. **Test Edge Cases** - Test card declines, network failures, etc.
5. **Keep Logs** - Maintain audit trail of subscription changes
6. **Document Pricing** - Keep record of price changes over time

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Webhook Testing Guide](https://stripe.com/docs/webhooks/test)
- Lovable Community Discord for integration help
