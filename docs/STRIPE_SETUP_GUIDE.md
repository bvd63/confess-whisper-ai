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
5. Copy the price ID (starts with `price_...`). You will reference it shortly.

### 1.2 VIP Yearly Subscription

1. Click **"+ Add Product"** again
2. Configure:
   - **Name**: `VIP Yearly`
   - **Description**: `Yearly VIP subscription with premium features (save 20%)`
   - **Pricing**: Recurring
   - **Price**: `$95.88` (or your preferred amount)
   - **Billing period**: `Yearly`
3. Click **"Save product"**
4. Copy the yearly price ID.

## Step 2: Configure Environment Variables

ConfessAI reads the same Stripe price IDs from both the frontend (Vite) and
Supabase Edge Functions. Set *all* of the following keys to the same value so the
shared resolver at `supabase/functions/_shared/stripe-config.ts` stays
consistent. Legacy `PRICE_VIP_*` keys remain optional but supported.

### Option A: Lovable Cloud Secrets (Recommended)

1. Open your project in Lovable.
2. Navigate to **Settings → Cloud → Secrets**.
3. Add these secrets (paste the IDs from Step 1):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_VIP_MONTHLY=price_1Abc...
STRIPE_PRICE_VIP_YEARLY=price_4Mno...
PRICE_VIP_MONTHLY=price_1Abc...        # optional legacy fallback
PRICE_VIP_YEARLY=price_4Mno...         # optional legacy fallback
VITE_STRIPE_PRICE_VIP_MONTHLY=price_1Abc...
VITE_STRIPE_PRICE_VIP_YEARLY=price_4Mno...
```

1. Save changes. Lovable automatically restarts functions to pick up new
   secrets.

### Option B: Local Development

Add the same variables to your `.env` for local testing:

```env
VITE_STRIPE_PRICE_VIP_MONTHLY=price_1Abc...
VITE_STRIPE_PRICE_VIP_YEARLY=price_4Mno...
STRIPE_PRICE_VIP_MONTHLY=price_1Abc...
STRIPE_PRICE_VIP_YEARLY=price_4Mno...
PRICE_VIP_MONTHLY=price_1Abc...
PRICE_VIP_YEARLY=price_4Mno...
```

> ⚠️ **Never** commit real secret keys.
> Use Lovable Secrets for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

## Step 3: Set Up Stripe Webhooks

Stripe webhooks notify Supabase when subscriptions change.

### 3.1 Create a Webhook Endpoint

1. Go to
   [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **"+ Add endpoint"**.
3. Configure:
    - **Endpoint URL**:
       `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
    - **Events**:
       - `checkout.session.completed`
       - `customer.subscription.created`
       - `customer.subscription.updated`
       - `customer.subscription.deleted`
4. Click **"Add endpoint"**.
5. Copy the signing secret (`whsec_...`) and store it as `STRIPE_WEBHOOK_SECRET`
   in Lovable Secrets.

## Step 4: Test the Integration

### 4.1 Test Checkout Flow

1. Rebuild/redeploy the app after saving secrets.
2. Open the subscription page and click **"Upgrade to VIP"**.
3. Use the Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC,
   any ZIP).
4. Complete checkout and verify:
   - ✅ Success page is shown
   - ✅ User profile shows VIP
   - ✅ Bonus coins awarded

### 4.2 Test Webhook Delivery

1. In Stripe Dashboard → **Webhooks**, select your endpoint.
2. Click **"Send test webhook"** and choose
   `checkout.session.completed`.
3. Ensure the request returns **200 OK**.

### 4.3 Check Logs

1. In Lovable, open **Cloud → Edge Functions**.
2. Select `stripe-webhook` or `create-checkout`.
3. Inspect recent logs for errors.

## Step 5: Switch to Production Mode

1. Toggle Stripe to **Live Mode**.
2. Repeat Step 1 to create live products and copy the new price IDs.
3. Update Lovable Secrets with live values:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
STRIPE_PRICE_VIP_MONTHLY=price_live_...
STRIPE_PRICE_VIP_YEARLY=price_live_...
PRICE_VIP_MONTHLY=price_live_...
PRICE_VIP_YEARLY=price_live_...
VITE_STRIPE_PRICE_VIP_MONTHLY=price_live_...
VITE_STRIPE_PRICE_VIP_YEARLY=price_live_...
```

1. Create a live-mode webhook endpoint and paste the new signing secret.
2. Run a low-dollar live transaction to confirm everything works, then restore
   production pricing.

## Troubleshooting

### "Price ID missing" warning

**Cause**: One or more environment variables were left blank.

**Fix**:

1. Confirm every `VITE_STRIPE_PRICE_VIP_*`, `STRIPE_PRICE_VIP_*`, and (if used)
   `PRICE_VIP_*` entry has the same value.
2. Rebuild the app so Vite picks up the changes.
3. Run `npm run check:env` to verify.

### Checkout button disabled

**Cause**: Client cannot read the Vite variables.

**Fix**:

1. Ensure `.env` (or Lovable secrets) includes
   `VITE_STRIPE_PRICE_VIP_MONTHLY` and `VITE_STRIPE_PRICE_VIP_YEARLY`.
2. Hard refresh the browser (Ctrl+Shift+R).
3. Check DevTools console for validation errors.

### Checkout fails with error

**Cause**: Invalid Stripe secret key or price ID.

**Fix**:

1. Confirm the secret key matches the current Stripe mode (test vs. live).
2. Verify the price IDs exist under Products → Prices.
3. Check `stripe-webhook` logs for the exact error.

### User not upgraded after payment

**Cause**: Webhook not received.

**Fix**:

1. Review the webhook delivery logs in Stripe.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint.
3. Resend the event or trigger `invoice.payment_succeeded` via Stripe CLI.

### Webhook returns 400 error

**Cause**: Signature verification failed or request body empty.

**Fix**:

1. Ensure the Supabase endpoint URL is correct.
2. Re-copy the signing secret into Lovable.
3. Confirm the function is deployed (look for logs in Lovable → Edge
   Functions).

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

- `src/lib/stripe-config.ts`
- `src/components/SubscriptionPlansGrid.tsx`
- `import.meta.env.VITE_STRIPE_PRICE_VIP_MONTHLY`
- `import.meta.env.VITE_STRIPE_PRICE_VIP_YEARLY`

### Backend (Private)

- `supabase/functions/create-checkout`
- `supabase/functions/subscription-upgrade`
- `supabase/functions/_shared/stripe-config.ts` (helper that resolves price
   IDs)
- Environment keys: `STRIPE_PRICE_VIP_MONTHLY`, `STRIPE_PRICE_VIP_YEARLY`,
   optional `PRICE_VIP_*`

> 💡 **Security Note**: Price IDs are public identifiers and safe to expose.
> **Never** expose `STRIPE_SECRET_KEY` or other sensitive secrets
> client-side.

## Best Practices

1. Start in Test Mode and exhaustively test the flow.
2. Monitor webhook failures in Stripe Dashboard.
3. Keep `scripts/check-env.ts` in CI to verify required keys.
4. Store all secrets in Lovable Cloud, not `.env` files committed to git.
5. Document live price changes for auditing.

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Webhook Testing Guide](https://stripe.com/docs/webhooks/test)
- Lovable Community Discord for integration help
