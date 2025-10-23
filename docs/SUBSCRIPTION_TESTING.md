# Subscription System Testing Guide

## Overview

This guide covers testing the complete subscription system with Stripe test mode integration.

**Note:** Application uses only **2 tiers**: Free and VIP (Premium plan removed)

## Test Environment Setup

### 1. Stripe Test Mode Configuration

All price IDs are stored as Supabase secrets:

- `STRIPE_PRICE_VIP_MONTHLY` - VIP monthly test price ($6.99/month)
- `STRIPE_PRICE_VIP_YEARLY` - VIP yearly test price ($54.99/year)

### 2. Test Page Access

Navigate to `/test-subscriptions` to access the comprehensive test suite.

## Test Functions Available

### Basic Status Checks

1. **Check Subscription** (`check-subscription`)
   - Returns current subscription status
   - Includes tier (free/vip), end date, and subscription ID
   - Updates profile in database


2. **Get Subscription Status** (`get-subscription-status`)
   - Detailed subscription information
   - Billing cycle details
   - Trial status

### Checkout & Purchase Flow

1. **Create Checkout Session** (`billing-buy`)
   - Creates Stripe checkout session
   - Parameters: `tier` (vip), `cycle` (monthly/yearly)
   - Returns checkout URL (check console)
   - Guards against duplicate subscriptions

### Subscription Management

1. **Preview Upgrade** (`billing-preview`)
   - Shows cost breakdown
   - Proration calculations
   - Displays next billing date

2. **Upgrade Subscription** (`manage-subscription-v2`)
   - Immediate upgrade to VIP
   - Automatic proration
   - VIP perks activated instantly

3. **Downgrade Subscription** - NOT AVAILABLE
   - VIP is only paid tier
   - Use "Cancel" to downgrade to Free
   - Cancellation takes effect at period end

4. **Cancel Subscription** (`billing-cancel`)
   - Schedules cancellation at period end
   - User retains access until then
   - Can be reactivated before end date

5. **Reactivate Subscription** (`billing-reactivate`)
   - Cancels the pending cancellation
   - Keeps VIP benefits
   - No charge until original renewal date

6. **Fix Subscription Sync** (`fix-subscription-sync`)
   - Manual sync with Stripe
   - Updates local database
   - Useful for troubleshooting

## Testing Workflows

### Complete Purchase Flow Test (Free → VIP)

```text
1. Start with no subscription (Free tier)
2. Check Subscription → Verify "free" tier
3. Create Checkout → Get Stripe checkout URL for VIP
4. Complete payment in Stripe (use test card: 4242 4242 4242 4242)
5. Check Subscription → Verify "vip" tier
6. Check profile coins → Should receive VIP bonus coins
```

### Cancel & Reactivate Flow Test

```text
1. Have active VIP subscription
2. Cancel Subscription → Scheduled for period end
3. Check Subscription → Still shows "vip" with cancel_at_period_end
4. Reactivate → Cancel scheduled downgrade
5. Check Subscription → Now shows active "vip" again
```

### Trial Flow Test (if enabled)

```text
2. Cancel Subscription → Access until period end
3. Check Subscription → Shows cancel_at_period_end
4. Reactivate Subscription → Restores auto-renewal
5. Check Subscription → cancel_at_period_end removed
```

## Stripe Test Cards

### Successful Payments

- **4242 4242 4242 4242** - Basic success
- **4000 0025 0000 3155** - 3D Secure required
- **5555 5555 5555 4444** - Mastercard success

### Failed Payments

- **4000 0000 0000 0002** - Card declined
- **4000 0000 0000 9995** - Insufficient funds

### Subscription-Specific Tests

- **4000 0000 0000 0341** - Attaches but fails on invoice
- **4000 0082 6000 0000** - Fails immediately

**All test cards:**

- CVV: Any 3 digits (e.g., 123)
- Expiry: Any future date
- ZIP: Any 5 digits (e.g., 12345)

## Edge Function Configuration

All functions are properly configured in `supabase/config.toml`:

```toml
[functions.check-subscription]
verify_jwt = true

[functions.billing-buy]
verify_jwt = true

[functions.billing-preview]
verify_jwt = true

[functions.billing-upgrade]
verify_jwt = true

[functions.billing-downgrade]
verify_jwt = true

[functions.billing-cancel]
verify_jwt = true

[functions.billing-reactivate]
verify_jwt = true

[functions.billing-resume]
verify_jwt = true

[functions.manage-subscription-v2]
verify_jwt = true

[functions.fix-subscription-sync]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false  # Stripe signs with webhook secret
```

## Database Tables

### Core Tables

- `profiles` - User subscription status and tier
- `subscription_entitlements` - Active subscription records
- `subscription_change_requests` - Pending changes
- `subscription_audit` - All subscription events
- `stripe_processed_events` - Webhook deduplication

### Key Columns in Profiles

```sql
subscription_tier: 'free' | 'vip'
subscription_status: 'active' | 'canceled' | 'past_due' | etc
subscription_end: timestamp with time zone
stripe_customer_id: text
stripe_subscription_id: text
is_premium: boolean  -- Legacy field, mapped to VIP
```

## Feature Gates

Components using `<FeatureGate>`:

### VIP Features

- FlairsShop button
- Export data button
- TrendingHashtags (for logged-in users)
- WordCloudViz
- AdvancedAnalytics
- Leaderboard (for logged-in users)

## Common Issues & Solutions

### "You already have an active subscription"

**Cause:** Trying to create new checkout with existing subscription
**Solution:** Use Upgrade/Downgrade instead, or cancel current subscription first

### "No Stripe customer found"

**Cause:** User hasn't completed any Stripe checkout yet
**Solution:** Create checkout session first

### "No active subscription found"

**Cause:** User has no active Stripe subscription
**Solution:** Cannot preview/upgrade/downgrade without active subscription

### Subscription not syncing

**Cause:** Webhook might have failed or missed
**Solution:** Use "Fix Subscription Sync" test button

### Profile still shows old tier

**Cause:** Cache or database not updated
**Solution:**

1. Run fix-subscription-sync
2. Check Stripe dashboard for actual status
3. Verify webhook secret is correct

## Webhook Testing

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

### Production Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

## Production Checklist

Before going live:

- [ ] Replace all test price IDs with production price IDs in secrets
- [ ] Update `STRIPE_SECRET_KEY` to production key
- [ ] Configure production webhook with correct URL and secret
- [ ] Test complete flow in production mode
- [ ] Verify RLS policies are secure
- [ ] Set up monitoring for failed webhooks
- [ ] Configure Stripe email receipts
- [ ] Set up cancellation feedback collection
- [ ] Test all subscription tiers
- [ ] Verify coin bonuses work correctly
- [ ] Test trial functionality if applicable
- [ ] Confirm feature gates work as expected

## Monitoring

### Key Metrics to Track

1. Successful checkouts vs abandoned
2. Upgrade vs downgrade ratio
3. Cancellation rate and reasons
4. Failed payment recovery
5. Webhook processing time
6. Subscription sync accuracy

### Database Queries

**Active subscriptions by tier:**

```sql
SELECT subscription_tier, COUNT(*) 
FROM profiles 
WHERE subscription_status = 'active'
GROUP BY subscription_tier;
```

**Recent subscription changes:**

```sql
SELECT * FROM subscription_audit 
ORDER BY created_at DESC 
LIMIT 50;
```

**Pending downgrades:**

```sql
SELECT * FROM subscription_change_requests 
WHERE status = 'pending';
```

**Failed webhook events:**

```sql
SELECT * FROM stripe_processed_events 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## Support Scenarios

### User wants refund

1. Check Stripe dashboard for payment
2. Process refund via Stripe dashboard or API
3. Subscription will cancel automatically
4. User profile updates via webhook

### User upgraded but still sees Free

1. Run "Fix Subscription Sync" test
2. Check Stripe dashboard - is subscription active?
3. Check webhook events in Stripe dashboard
4. Verify webhook secret is correct
5. Check subscription_audit table for events
6. Manually update profile if needed

### Double charging issue

1. Check Stripe dashboard for duplicate charges
2. Review subscription_audit for duplicate events
3. Check stripe_processed_events for duplicates
4. Refund duplicate charge via Stripe
5. Verify webhook deduplication is working

## Best Practices

1. **Always test in Stripe test mode first**
2. **Use the test page for comprehensive testing**
3. **Monitor webhook failures closely**
4. **Keep audit logs for at least 90 days**
5. **Sync subscription status on every app load**
6. **Cache subscription status client-side for performance**
7. **Show clear error messages to users**
8. **Provide easy access to manage subscription**
9. **Allow reactivation before period end**
10. **Test edge cases (expired cards, failed payments, etc.)**
