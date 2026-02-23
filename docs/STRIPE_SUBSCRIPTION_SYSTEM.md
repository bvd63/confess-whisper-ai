# Stripe Subscription System - Implementation Complete

## Overview
Complete subscription system with upgrade/downgrade flows, proper entitlement tracking, and Stripe integration.

## Architecture

### Database Tables
- **subscription_entitlements**: Stores user subscription data with tier, valid_until, stripe_subscription_id
- **subscription_change_requests**: Tracks pending downgrades scheduled for period end
- **subscription_audit**: Logs all subscription-related actions
- **stripe_processed_events**: Prevents duplicate webhook processing

### Edge Functions

#### Payment & Checkout
- **create-checkout-session**: Creates Stripe checkout session for new subscriptions
- **billing-confirm**: Confirms payment completion and entitlement activation (used by frontend polling)

#### Subscription Management
- **subscription-upgrade**: Handles immediate subscription upgrades with proration
- **subscription-downgrade**: Schedules downgrade to occur at period end
- **billing-cancel**: Cancels subscription (immediate or at period end)

#### Webhook Processing
- **stripe-webhook**: Processes Stripe events (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.upcoming`)
  - Updates `subscription_entitlements` table
  - Updates `profiles` table (is_premium, subscription_tier, subscription_status)
  - Handles pending downgrades on `invoice.upcoming`
  - Awards subscription coins on first charge

## Frontend Integration

### Hooks
- **useSubscriptionActions**: Provides `upgradeSubscription()` and `downgradeSubscription()` functions
- **useSubscriptionCheck**: Fetches subscription entitlements from database
- **usePremiumStatus**: Updated to merge profile and entitlement data

### Components
- **EnhancedSubscriptionManager**: Full subscription management UI with upgrade/downgrade/cancel
- **ManageSubscriptionDialog**: Dialog wrapper for subscription manager
- **PaymentSuccess**: Polls `billing-confirm` endpoint to verify entitlement activation
- **SubscriptionPlans**: Displays plans and initiates checkout

## Payment Flow

### New Subscription
1. User clicks "Subscribe" button
2. Frontend calls `create-checkout-session` edge function
3. User redirected to Stripe Checkout
4. After payment, redirected to `/payment-success?session_id={SESSION_ID}`
5. PaymentSuccess page polls `billing-confirm` endpoint
6. Once confirmed, displays success message and awards bonus coins

### Upgrade (Immediate)
1. User clicks "Upgrade" in subscription manager
2. Frontend calls `subscription-upgrade` with target price ID
3. Stripe subscription updated with `proration_behavior: "create_prorations"` and `billing_cycle_anchor: "now"`
4. Entitlements updated immediately
5. User charged prorated amount right away

### Downgrade (At Period End)
1. User clicks "Downgrade" in subscription manager
2. Frontend calls `subscription-downgrade` with target price ID
3. Record inserted into `subscription_change_requests` with status "pending"
4. On next `invoice.upcoming` webhook, downgrade is applied
5. User retains current tier until period end

### Cancel
1. User clicks "Cancel" in subscription manager
2. Frontend calls `billing-cancel` with `effective: "period_end"`
3. Stripe subscription updated with `cancel_at_period_end: true`
4. User retains access until period end

## Webhook Setup

Configure in Stripe Dashboard → Developers → Webhooks:

**Endpoint URL:**
```
https://maurqhwkhmmfigzdatsm.supabase.co/functions/v1/stripe-webhook
```

**Events to Listen For:**
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.upcoming`

**Webhook Secret:**
Already configured as `STRIPE_WEBHOOK_SECRET` in Supabase secrets.

## Testing

### Test Mode Configuration
All price IDs in `src/lib/stripe-config.ts` are currently set to Stripe test mode prices:
- Premium Monthly: `price_1SIVqFR7kygIyYg9Ai1tJ2AI`
- Premium Yearly: `price_1SIVqeR7kygIyYg9FizFMLRx`
- VIP Monthly: `price_1SL42cR7kygIyYg9LFEBp8uz`
- VIP Yearly: `price_1SL42zR7kygIyYg9IZrd2ExW`

### Test Cards
Use Stripe test cards for testing:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

### Testing Webhooks Locally
Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to https://maurqhwkhmmfigzdatsm.supabase.co/functions/v1/stripe-webhook
```

## Security Features
- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- Idempotency via `stripe_processed_events` table
- RLS policies on all subscription tables
- Audit logging of all actions

## Coin Bonuses
- First subscription charge awards bonus coins via `award-subscription-coins` function
- Amount varies by tier (defined in edge function)
- Tracked to prevent duplicate awards

## Production Checklist
- [ ] Update price IDs in `src/lib/stripe-config.ts` to production values
- [ ] Configure production webhook in Stripe Dashboard
- [ ] Update `STRIPE_SECRET_KEY` to production key
- [ ] Test complete flow in production mode
- [ ] Set up Stripe Customer Portal (required for customer-portal function)
- [ ] Configure email notifications in Stripe Dashboard

## Troubleshooting

### Payment Not Confirming
- Check `billing-confirm` edge function logs
- Verify webhook is receiving events
- Check `subscription_entitlements` table for user

### Upgrade Not Working
- Check `subscription-upgrade` edge function logs
- Verify user has active subscription
- Check Stripe Dashboard for subscription status

### Downgrade Not Applying
- Check `subscription_change_requests` table for pending request
- Verify `invoice.upcoming` webhook is configured
- Check `stripe-webhook` function logs
