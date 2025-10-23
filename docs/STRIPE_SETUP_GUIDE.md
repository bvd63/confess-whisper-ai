# 🔐 Stripe Integration Setup Guide

Complete guide for configuring Stripe payments in Confess+ application.

---

## 📋 **Prerequisites**

1. ✅ Stripe Account (create at [stripe.com](https://stripe.com))
2. ✅ Supabase Project with Edge Functions enabled
3. ✅ Domain configured (for production)

---

## 🔑 **Step 1: Get Stripe API Keys**

### Development/Test Keys

1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle **"Test mode"** ON (top right)
3. Navigate to **Developers → API Keys**
4. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Production Keys

1. Toggle **"Test mode"** OFF
2. Navigate to **Developers → API Keys**
3. Copy:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

---

## ⚙️ **Step 2: Configure Environment Variables**

### A. Frontend (.env file)

```bash
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe Publishable Key (client-side safe)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here  # Test mode
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here  # Production
```

### B. Supabase Edge Functions (Supabase Dashboard)

1. Go to **Project Settings → Edge Functions → Secrets**
2. Add the following secrets:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here  # Test mode
# STRIPE_SECRET_KEY=sk_live_your_secret_key_here  # Production

STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here  # (Step 4)
```

---

## 💳 **Step 3: Create Stripe Products & Prices**

### Option A: Using Stripe Dashboard (Recommended for beginners)

1. **Navigate to:** Products → **+ Add product**

2. **Create VIP Plan:**
   - Name: `Confess+ VIP`
   - Description: `VIP exclusive features for Confess+ users`
   - **Pricing:**
     - Monthly: `$6.99/month` (Recurring)
     - Yearly: `$54.99/year` (Recurring, save 35%)
   - Click **Save product**
   - Copy **Price ID** for each (e.g., `price_xxx_monthly`, `price_xxx_yearly`)

3. **Update Environment Variables:**
   - **Pricing:**
     - Monthly: `$9.99/month` (Recurring)
     - Yearly: `$99.99/year` (Recurring, save 17%)
   - Click **Save product**
   - Copy **Price ID** for each

### Option B: Using Stripe CLI (Advanced)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Create VIP Product
stripe products create \
  --name="Confess+ VIP" \
  --description="VIP exclusive features for Confess+ users"

# Create VIP Monthly Price (replace prod_xxx with your product ID)
stripe prices create \
  --product=prod_xxx \
  --unit-amount=699 \
  --currency=usd \
  --recurring[interval]=month

# Create VIP Yearly Price
stripe prices create \
  --product=prod_xxx \
  --unit-amount=5499 \
  --currency=usd \
  --recurring[interval]=year
```

### C. Update Price IDs in Code

Update file: `src/lib/subscription-plans.ts`

```typescript
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceIdMonthly: 'free',
    benefits: [/* ... */],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceMonthly: 6.99,
    priceYearly: 54.99,
    stripePriceIdMonthly: 'price_xxx_vip_monthly',  // Replace with your Price ID
    stripePriceIdYearly: 'price_xxx_vip_yearly',    // Replace with your Price ID
    isPopular: true,
    benefits: [/* ... */],
  },
];
```

---

## 🔔 **Step 4: Configure Stripe Webhooks**

Webhooks notify your app when subscription events occur (payment success, cancellation, etc.)

### Development (Local Testing)

1. **Install Stripe CLI** (if not done in Step 3)

2. **Forward webhooks to local Edge Function:**

   ```bash
   stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

3. **Copy webhook signing secret** (starts with `whsec_`)
   - Add to Supabase Edge Functions secrets as `STRIPE_WEBHOOK_SECRET`

### Production

1. **Navigate to:** Developers → **Webhooks** → **+ Add endpoint**

2. **Endpoint URL:**

   ```text
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```

3. **Select events to listen to:**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `checkout.session.completed`

4. **Add endpoint** → Copy **Signing secret** (starts with `whsec_`)

5. **Add to Supabase:**
   - Go to Project Settings → Edge Functions → Secrets
   - Add: `STRIPE_WEBHOOK_SECRET=whsec_your_production_secret`

---

## 🧪 **Step 5: Test the Integration**

### A. Test Checkout Flow

1. **Start local dev server:**

   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/profile`

3. **Click "Upgrade to VIP"**

4. **Use Stripe Test Cards:**
   - ✅ **Success:** `4242 4242 4242 4242` (any future date, any CVC)
   - ❌ **Decline:** `4000 0000 0000 0002`
   - 🔐 **3D Secure:** `4000 0025 0000 3155`
   - More: [Stripe Test Cards](https://stripe.com/docs/testing#cards)

### B. Verify in Stripe Dashboard

1. Check **Payments** → Recent payments
2. Check **Customers** → New customer created
3. Check **Subscriptions** → Active subscription

### C. Test Webhook Events

```bash
# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

---

## 🚀 **Step 6: Deploy to Production**

### A. Update Environment Variables

1. **Frontend (.env.production):**

   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```

2. **Supabase Edge Functions:**
   - Replace `STRIPE_SECRET_KEY` with live key (`sk_live_xxx`)
   - Update `STRIPE_WEBHOOK_SECRET` with production webhook secret

### B. Update Product/Price IDs

- If using different products for production, update `src/lib/stripe-config.ts`

### C. Build & Deploy

```bash
npm run build
# Deploy to your hosting (Vercel, Netlify, etc.)
```

---

## 📊 **Edge Functions Summary**

Your app uses these Stripe-related Edge Functions:

| Function | Purpose | Stripe API Used |
|----------|---------|-----------------|
| `billing-status` | Get current subscription status | `customers.list`, `subscriptions.list` |
| `billing-buy` | Create new subscription | `checkout.sessions.create` |
| `billing-change` | Change subscription plan | `subscriptions.update` |
| `billing-cancel` | Cancel subscription | `subscriptions.update` |
| `billing-reactivate` | Reactivate cancelled subscription | `subscriptions.update` |
| `check-subscription` | Verify subscription validity | `customers.list`, `subscriptions.list` |
| `create-checkout-session` | Create payment session | `checkout.sessions.create` |
| `customer-portal` | Access Stripe customer portal | `billingPortal.sessions.create` |

---

## 🔍 **Troubleshooting**

### Issue: "STRIPE_SECRET_KEY is not set"

**Solution:** Add secret to Supabase Edge Functions (Step 2B)

### Issue: Webhook not receiving events

**Solution:**

1. Check webhook URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is set
3. Check webhook logs in Stripe Dashboard

### Issue: "Invalid API Key"

**Solution:**

1. Verify key starts with `sk_test_` (test) or `sk_live_` (production)
2. Check key is copied completely (no spaces)
3. Ensure test/live mode matches in Stripe Dashboard

### Issue: Checkout redirects to 404

**Solution:** Update redirect URLs in Edge Functions:

```typescript
success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${req.headers.get('origin')}/payment-canceled`,
```

---

## 📚 **Additional Resources**

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## ✅ **Production Checklist**

Before going live:

- [ ] Test mode disabled in Stripe Dashboard
- [ ] Live API keys configured in Supabase
- [ ] Production webhook endpoint added
- [ ] All test transactions removed/refunded
- [ ] SSL/HTTPS enabled on domain
- [ ] Terms of Service & Privacy Policy updated
- [ ] Subscription confirmation emails tested
- [ ] Customer portal accessible
- [ ] Cancellation flow tested
- [ ] Refund policy documented

---

**Need help?** Contact Stripe Support or check the [Stripe Community](https://community.stripe.com/)
