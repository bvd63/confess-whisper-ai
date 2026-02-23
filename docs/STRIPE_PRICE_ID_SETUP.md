# 🎯 Stripe Price ID Configuration Guide

**Time Required:** 10 minutes  
**Prerequisites:** Stripe account with test mode enabled

---

## 📋 Overview

ConfessAI requires two Stripe Price IDs to function:
1. **VIP Monthly** - `VITE_STRIPE_PRICE_VIP_MONTHLY`
2. **VIP Yearly** - `VITE_STRIPE_PRICE_VIP_YEARLY`

These are **public identifiers** (not secret keys) and are safe to use in the frontend.

---

## 🚀 Step-by-Step Setup

### Step 1: Access Stripe Dashboard (1 minute)

1. Go to https://dashboard.stripe.com
2. Ensure you're in **Test Mode** (toggle in top right)
3. Navigate to **Products** in the left sidebar

---

### Step 2: Create VIP Monthly Product (3 minutes)

1. Click **"+ Add product"** button

2. **Product Details:**
   - **Name:** `VIP Monthly`
   - **Description:** `Premium access with unlimited confessions, priority AI, and double coins`
   - **Image:** (optional) Upload VIP badge or logo

3. **Pricing:**
   - **Pricing model:** `Standard pricing`
   - **Price:** `$6.99` (or your preferred price)
   - **Billing period:** `Monthly`
   - **Currency:** `USD`

4. Click **"Save product"**

5. **Copy the Price ID:**
   - After saving, you'll see a Price ID like: `price_1Abc2DefGhi3Jkl`
   - Copy this - you'll need it in Step 4

---

### Step 3: Create VIP Yearly Product (3 minutes)

1. Click **"+ Add product"** button again

2. **Product Details:**
   - **Name:** `VIP Yearly`
   - **Description:** `Premium access for a full year - Save 34%!`
   - **Image:** (same as monthly)

3. **Pricing:**
   - **Pricing model:** `Standard pricing`
   - **Price:** `$54.99` (or your preferred price)
   - **Billing period:** `Yearly`
   - **Currency:** `USD`

4. Click **"Save product"**

5. **Copy the Price ID:**
   - Copy the yearly Price ID: `price_4Mno5PqrStu6Vwx`

---

### Step 4: Configure in Lovable (2 minutes)

You have **two options** for adding these IDs:

#### Option A: Using Secrets Manager (Recommended)

Since these are **publishable** (not secret) identifiers, you can add them directly to your project settings:

1. In Lovable, go to **Project Settings** → **Environment Variables**
2. Add these variables:
   ```
   VITE_STRIPE_PRICE_VIP_MONTHLY=price_1Abc2DefGhi3Jkl
   VITE_STRIPE_PRICE_VIP_YEARLY=price_4Mno5PqrStu6Vwx
   ```
3. Click **Save**

#### Option B: Using .env File (Alternative)

If you have access to the .env file:
```bash
# Stripe Price IDs (Test Mode)
VITE_STRIPE_PRICE_VIP_MONTHLY=price_1Abc2DefGhi3Jkl
VITE_STRIPE_PRICE_VIP_YEARLY=price_4Mno5PqrStu6Vwx
```

---

### Step 5: Verify Configuration (1 minute)

1. **Rebuild the app** (Lovable will auto-rebuild on env change)
2. **Open the app** in preview
3. **Navigate to** Manage Subscriptions
4. **Check that:**
   - ✅ VIP Monthly plan shows correct price
   - ✅ VIP Yearly plan shows correct price
   - ✅ "Save 34%" badge appears on yearly
   - ✅ No "Price ID missing" warnings in console

---

## 🧪 Testing Your Configuration

### Test Checkout Flow (5 minutes)

1. **Click "Choose VIP"** button
2. **You should be redirected** to Stripe Checkout
3. **Use test card:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

4. **Complete checkout**
5. **Verify redirect** back to app with success status
6. **Check profile** - should show VIP tier
7. **Verify coins** - should receive 250 bonus coins

### Test Webhooks (2 minutes)

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select **"checkout.session.completed"**
5. Click **"Send test webhook"**
6. **Check response:** Should be 200 OK
7. **Check logs:** Supabase Functions → stripe-webhook → Logs

---

## 🔄 Switching to Production Mode

### When Ready for Live Payments

1. **In Stripe Dashboard:**
   - Toggle from **Test Mode** to **Live Mode**
   - Go to **Products**
   - Create VIP Monthly and VIP Yearly again (prices can be same or different)
   - Copy new **production** Price IDs

2. **Update Environment Variables:**
   ```bash
   # Replace test IDs with production IDs
   VITE_STRIPE_PRICE_VIP_MONTHLY=price_PRODUCTION_MONTHLY_ID
   VITE_STRIPE_PRICE_VIP_YEARLY=price_PRODUCTION_YEARLY_ID
   ```

3. **Update Stripe Secret Key:**
   - In Supabase Dashboard → Project Settings → Edge Function Secrets
   - Update `STRIPE_SECRET_KEY` from test key (`sk_test_...`) to live key (`sk_live_...`)

4. **Update Webhook Secret:**
   - Create production webhook in Stripe
   - Update `STRIPE_WEBHOOK_SECRET` in Supabase

5. **Test with real card** (start with small amount!)

---

## 🐛 Troubleshooting

### "Price ID missing" warning
**Cause:** Environment variable not set or not prefixed with `VITE_`  
**Solution:** Ensure variable name is exactly `VITE_STRIPE_PRICE_VIP_MONTHLY`

### Button disabled, no error message
**Cause:** Price ID is empty string or null  
**Solution:** Check browser console for warnings, verify env vars are set

### Checkout button does nothing
**Cause:** Edge function error or Stripe API issue  
**Solution:** 
1. Check browser console for errors
2. Check Network tab for failed requests
3. Check Supabase Edge Function logs

### Redirected to wrong URL after checkout
**Cause:** Success/cancel URLs not configured  
**Solution:** Check `create-checkout` edge function has correct return URLs

### Webhook not receiving events
**Cause:** Webhook URL incorrect or secret mismatch  
**Solution:**
1. Verify webhook URL: `https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook`
2. Check webhook secret matches Supabase secret
3. Test with Stripe CLI: `stripe trigger checkout.session.completed`

---

## 📊 Price ID Reference

### Format
- Test Mode: `price_1Abc2DefGhi3Jkl`
- Live Mode: `price_2Mno3PqrStu4Vwx`

### Where Used
- **Frontend:** `src/lib/stripe-config.ts`
  ```typescript
  export const STRIPE_PRICE = {
    VIP_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_VIP_MONTHLY!,
    VIP_YEARLY: import.meta.env.VITE_STRIPE_PRICE_VIP_YEARLY!,
  };
  ```

- **Components:**
  - `src/components/SubscriptionPlansGrid.tsx`
  - `src/components/ManageSubscriptionDialog.tsx`
  - `src/lib/subscription-plans.ts`

### Not Secret
Price IDs are **safe to expose** in:
- ✅ Client-side JavaScript
- ✅ Public repositories
- ✅ Browser DevTools
- ✅ HTML source code

They are **identifiers**, not **credentials**.

---

## ✅ Final Checklist

Before going live:
- [ ] VIP Monthly product created in Stripe
- [ ] VIP Yearly product created in Stripe
- [ ] Both Price IDs copied correctly
- [ ] Environment variables set in Lovable/Supabase
- [ ] App rebuilt and deployed
- [ ] Checkout flow tested with test card
- [ ] Success redirect working
- [ ] VIP status updating in profile
- [ ] Bonus coins awarded (250)
- [ ] Webhook receiving events
- [ ] Customer Portal accessible
- [ ] No console errors

---

## 🎯 Quick Reference Card

```bash
# Test Mode Price IDs (for development)
VITE_STRIPE_PRICE_VIP_MONTHLY=price_1Abc2DefGhi3Jkl
VITE_STRIPE_PRICE_VIP_YEARLY=price_4Mno5PqrStu6Vwx

# Test Card
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345

# Webhook URL (replace PROJECT_ID)
https://maurqhwkhmmfigzdatsm.supabase.co/functions/v1/stripe-webhook

# Events to Listen For
✓ checkout.session.completed
✓ customer.subscription.created
✓ customer.subscription.updated
✓ customer.subscription.deleted
✓ invoice.payment_succeeded
```

---

## 🚀 You're Done!

Once configured, your subscription system is **100% operational** and ready for production! 

**Next steps:**
1. Follow `docs/DEPLOYMENT_CHECKLIST.md` for full launch
2. Set up monitoring per `docs/PRODUCTION_MONITORING_SETUP.md`
3. Review `docs/FINAL_REPORT.md` for complete overview

---

**Last Updated:** 2025-10-26  
**Version:** 1.0.0
