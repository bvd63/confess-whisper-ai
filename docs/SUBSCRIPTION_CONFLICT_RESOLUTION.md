# Subscription Conflict Resolution System

## Overview

System for enforcing **one active subscription per user** with automatic conflict resolution when Stripe creates duplicate subscriptions.

## Architecture

### Database

**Table:** `subscription_conflict_logs`

- Tracks all conflict resolutions
- Columns: `user_id`, `conflict_type`, `kept_subscription_id`, `canceled_subscription_id`, `existing_status`, `new_status`, `resolution_reason`, `payload`

### Conflict Resolution Policy

**Priority Rule:** Prefer NEW subscription when:

- Existing subscription is `past_due`, `unpaid`, or `canceled`
- Existing subscription has `cancel_at_period_end = true` AND new subscription is `active`/`trialing`/`incomplete`

**Default:** Otherwise, keep OLD subscription and cancel NEW one.

## Implementation

### 1. Webhook Handler

**File:** `supabase/functions/stripe-webhook/index.ts`

**Events with conflict resolution:**

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `invoice.payment_succeeded`

**Logic:**

```typescript
// Check for existing active subscription
if (existingProfile?.stripe_subscription_id && 
    existingProfile.stripe_subscription_id !== subscription.id && 
    activeLike.includes(existingProfile.subscription_status)) {
  
  // Determine which to keep
  const preferNew = existingIsDelinquent || (existingWillEnd && newIsActiveish);
  
  if (preferNew) {
    // Cancel OLD, keep NEW
    await stripe.subscriptions.cancel(existingProfile.stripe_subscription_id);
    // Log to subscription_conflict_logs
  } else {
    // Cancel NEW, keep OLD
    await stripe.subscriptions.cancel(subscription.id);
    // Skip profile update
  }
}
```

### 2. Checkout Guard

**File:** `supabase/functions/create-checkout-session/index.ts`

Blocks checkout if user already has active subscription:

```typescript
const blockStatuses = ['active', 'trialing', 'incomplete', 'past_due', 'unpaid'];
if (profile?.stripe_subscription_id && blockStatuses.includes(profile.subscription_status)) {
  return 409: "ALREADY_SUBSCRIBED"
}
```

### 3. Frontend Integration

#### Conflict Notification Hook

**File:** `src/hooks/useSubscriptionConflictCheck.ts`

- Checks for conflicts created in last 5 minutes
- Displays toast notification to user
- Integrated in `App.tsx`

#### Error Handling

**File:** `src/components/ManageSubscriptionDialog.tsx`

Handles 409 error from checkout guard:

```typescript
if (error.message?.includes('ALREADY_SUBSCRIBED')) {
  toast.error(t.subscription_already_subscribed);
}
```

### 4. Translations

**File:** `src/i18n/translations.ts`

Keys added (EN/ES/DE):

- `subscription_single_active_policy`
- `subscription_already_subscribed`
- `subscription_conflict_resolved_keep_new`
- `subscription_conflict_resolved_keep_old`

## Testing Scenarios

### ✅ Scenario 1: New User Purchase

**Flow:** Free → VIP via Checkout
**Expected:** VIP activated, no conflicts

### ✅ Scenario 2: Active User Attempts Second Purchase

**Flow:** VIP active → Try VIP again via Portal/Checkout
**Expected:**

- Checkout: Blocked with 409 error
- Portal: Conflict detected, OLD kept, NEW canceled

### ✅ Scenario 3: Pending Cancel + New Purchase

**Flow:** VIP `cancel_at_period_end=true` → VIP again via Portal
**Expected:** NEW VIP kept, OLD VIP canceled immediately

### ✅ Scenario 4: Past Due + New Purchase

**Flow:** VIP `past_due` → VIP again via Portal
**Expected:** NEW VIP kept, OLD VIP canceled

### ✅ Scenario 5: Normal Reactivation

**Flow:** VIP active → Cancel → Reactivate before period end
**Expected:** Uses billing-reactivate edge function (no conflict)

## Monitoring

### Check Conflict Logs

```sql
SELECT * FROM subscription_conflict_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

### Check User Subscription Status

```sql
SELECT 
  user_id,
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  subscription_cancel_at_period_end,
  subscription_ends_at
FROM profiles 
WHERE stripe_subscription_id IS NOT NULL;
```

### Check Recent Webhooks

```sql
SELECT * FROM stripe_processed_events 
WHERE type IN (
  'checkout.session.completed',
  'customer.subscription.updated',
  'invoice.payment_succeeded'
)
ORDER BY created_at DESC 
LIMIT 100;
```

## Troubleshooting

### User Has Two Active Subscriptions in Stripe

1. Check `subscription_conflict_logs` for resolution attempts
2. Verify webhook signature and secret are correct
3. Manually cancel one subscription in Stripe Dashboard
4. Update `profiles` table to reflect correct subscription

### Conflict Not Detected

1. Check webhook logs in Supabase Edge Functions
2. Verify `subscription_status` in `profiles` table is accurate
3. Check `stripe_processed_events` for duplicate event processing

### Wrong Subscription Kept

1. Review conflict logic in webhook handler
2. Check `resolution_reason` in `subscription_conflict_logs`
3. Adjust priority rules if needed

## Best Practices

1. **Always test in Stripe test mode first**
2. **Monitor conflict logs regularly** (first week after deployment)
3. **Set up alerts** for `conflict_type = 'KEEP_OLD'` (unexpected behavior)
4. **Document any manual interventions** in customer notes
5. **Keep webhook logs** for at least 30 days

## Production Deployment Checklist

- [ ] Verify webhook secret is configured
- [ ] Test all scenarios in Stripe test mode
- [ ] Monitor conflict logs for 48 hours after deployment
- [ ] Set up alerts for high conflict rates
- [ ] Document process for customer support team
- [ ] Update Stripe Dashboard settings to disable duplicate subscriptions
- [ ] Enable email notifications for subscription changes

## Support Contact

For issues with the conflict resolution system:

1. Check Edge Function logs
2. Review `subscription_conflict_logs` table
3. Verify Stripe webhook events
4. Contact development team with user_id and conflict details
