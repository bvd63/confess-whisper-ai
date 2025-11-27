# Subscription System - Complete Implementation

## 🎉 System Overview

Complete Stripe-based subscription system with 3 tiers (Free, Premium, VIP), supporting monthly and yearly billing cycles, with secure price management and comprehensive testing capabilities.

## 📋 Table of Contents
1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [Edge Functions](#edge-functions)
4. [Frontend Components](#frontend-components)
5. [Database Schema](#database-schema)
6. [Feature Gates](#feature-gates)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## Architecture

### High-Level Flow
```
User → Frontend Component → Edge Function → Stripe API → Webhook → Database Update
```

### Three-Tier System
- **Free**: 5 confessions/day, basic features, ads
- **Premium**: 10 confessions/day, no ads, advanced analytics ($4.99/mo or $39.99/yr)
- **VIP**: Unlimited confessions, all premium features, priority support ($9.99/mo or $79.99/yr)

### Security Model
- Price IDs stored as Supabase secrets (not in code)
- JWT authentication for all subscription operations
- Webhook signature verification
- RLS policies on all subscription tables
- Idempotency checks for webhooks

---

## Configuration

### Environment Secrets (Supabase)

All Stripe configuration is stored as secrets:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (Test Mode)
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_PRICE_VIP_MONTHLY=price_...
STRIPE_PRICE_VIP_YEARLY=price_...
```

### Frontend Configuration

**src/lib/stripe-config.ts** - Placeholder for type safety only:
```typescript
export const STRIPE_PRICE_IDS = {
  premium_monthly: "",  // Managed in backend
  premium_yearly: "",   // Managed in backend
  vip_monthly: "",      // Managed in backend
  vip_yearly: "",       // Managed in backend
}
```

**src/lib/subscription-plans.ts** - Display prices and benefits:
```typescript
export const SUBSCRIPTION_PLANS = [
  {
    id: 'premium',
    priceMonthly: 4.99,
    priceYearly: 39.99,
    stripePriceIdMonthly: 'premium_monthly', // Keys, not actual IDs
    stripePriceIdYearly: 'premium_yearly',
    benefits: [...],
  },
  // ... VIP plan
]
```

---

## Edge Functions

### 1. **check-subscription** ✅
**Purpose**: Get current subscription status and sync with Stripe

**Auth**: Required (JWT)

**Request**: None

**Response**:
```json
{
  "subscribed": true,
  "product_id": "prod_...",
  "subscription_end": "2025-02-15T00:00:00Z"
}
```

**Called**: On app load, after auth, periodically

---

### 2. **billing-buy** ✅
**Purpose**: Create Stripe Checkout session for new subscription

**Auth**: Required (JWT)

**Request**:
```json
{
  "tier": "premium",
  "cycle": "monthly"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Guards**: Blocks if user already has active subscription

---

### 3. **billing-confirm** ✅
**Purpose**: Confirm successful checkout and activate subscription

**Auth**: Required (JWT)

**Request**:
```json
{
  "session_id": "cs_test_..."
}
```

**Response**:
```json
{
  "success": true,
  "subscription_id": "sub_...",
  "tier": "premium"
}
```

**Actions**: 
- Verifies Stripe session
- Updates profile tier
- Creates subscription_entitlements record
- Awards bonus coins

---

### 4. **billing-preview** ✅
**Purpose**: Preview costs before upgrade/downgrade

**Auth**: Required (JWT)

**Request**:
```json
{
  "targetPriceId": "vip_monthly"
}
```

**Response**:
```json
{
  "preview": {
    "amountDue": 500,
    "currency": "usd",
    "prorationAmount": 250,
    "lines": [...]
  }
}
```

**Requirements**: User must have active subscription

---

### 5. **manage-subscription-v2** ✅
**Purpose**: Unified subscription management (upgrade/downgrade/cancel/reactivate)

**Auth**: Required (JWT)

**Request**:
```json
{
  "action": "upgrade",
  "targetTier": "vip"
}
```

**Actions**:
- `upgrade`: Immediate proration and tier change
- `downgrade`: Scheduled at period end
- `cancel`: Cancel at period end
- `cancel_now`: Immediate cancellation
- `reactivate`: Remove pending cancellation

**Response**:
```json
{
  "success": true,
  "message": "Subscription upgraded successfully"
}
```

---

### 6. **billing-cancel** ✅
**Purpose**: Cancel subscription at period end

**Auth**: Required (JWT)

**Request**: None

**Response**:
```json
{
  "success": true,
  "message": "Subscription will cancel on 2025-02-15"
}
```

**Note**: User retains access until period end

---

### 7. **billing-reactivate** ✅
**Purpose**: Reactivate canceled subscription

**Auth**: Required (JWT)

**Request**: None

**Response**:
```json
{
  "success": true,
  "message": "Subscription reactivated"
}
```

**Note**: Only works before period end

---

### 8. **billing-resume** ✅
**Purpose**: Resume paused subscription

**Auth**: Required (JWT)

**Request**: None

**Response**:
```json
{
  "success": true,
  "message": "Subscription resumed"
}
```

---

### 9. **fix-subscription-sync** ✅
**Purpose**: Manual sync with Stripe (troubleshooting)

**Auth**: Required (JWT)

**Request**: None

**Response**:
```json
{
  "success": true,
  "tier": "premium",
  "status": "active"
}
```

**Use Cases**:
- Webhook missed/failed
- Database out of sync
- User reports incorrect tier

---

### 10. **stripe-webhook** ✅
**Purpose**: Process Stripe webhook events

**Auth**: None (Stripe signature verification)

**Events Handled**:
- `checkout.session.completed` - New subscription
- `customer.subscription.created` - Subscription started
- `customer.subscription.updated` - Tier/status change
- `customer.subscription.deleted` - Subscription ended
- `invoice.payment_succeeded` - Payment received
- `invoice.payment_failed` - Payment failed

**Actions**:
- Updates profiles table
- Creates/updates subscription_entitlements
- Awards coins on first payment
- Logs to subscription_audit
- Idempotency via stripe_processed_events

---

## Frontend Components

### 1. **SubscriptionProvider** (Context)
**Location**: `src/state/SubscriptionProvider.tsx`

**Purpose**: Global subscription state management

**Provides**:
```typescript
{
  subscriptionTier: 'free' | 'premium' | 'vip',
  isLoading: boolean,
  refreshSubscription: () => Promise<void>
}
```

**Usage**:
```tsx
const { subscriptionTier } = useSubscription();
```

---

### 2. **FeatureGate** (Access Control)
**Location**: `src/components/auth/FeatureGate.tsx`

**Purpose**: Conditionally render features based on subscription tier

**Props**:
```typescript
{
  minTier: 'premium' | 'vip',
  children: ReactNode,
  teaserPriceHint?: string,
  compact?: boolean,
  onUpgradeOverride?: () => void
}
```

**Example**:
```tsx
<FeatureGate minTier="premium" teaserPriceHint="$4.99/mo">
  <AdvancedAnalytics />
</FeatureGate>
```

**Behavior**:
- If user has required tier: Renders children
- If user doesn't: Shows UpgradeTeaser with CTA

---

### 3. **UpgradeTeaser** (Paywall UI)
**Location**: `src/components/paywall/UpgradeTeaser.tsx`

**Purpose**: Beautiful upgrade prompt with feature benefits

**Features**:
- Glassmorphism design
- Animated gradient background
- Feature bullet points
- CTA button to upgrade
- Compact mode for inline usage

---

### 4. **SubscriptionPlansGrid** (Pricing Table)
**Location**: `src/components/SubscriptionPlansGrid.tsx`

**Purpose**: Display pricing plans with monthly/yearly toggle

**Features**:
- Monthly/Yearly toggle
- Savings badge for yearly
- Current plan indicator
- Disabled state for current plan
- Premium/VIP comparison

**Usage**:
```tsx
<SubscriptionPlansGrid
  currentPlan="free"
  interval={interval}
  onIntervalChange={setInterval}
  onSelectPlan={handleSelectPlan}
/>
```

---

### 5. **ManageSubscriptionDialog** (Management UI)
**Location**: `src/components/ManageSubscriptionDialog.tsx`

**Purpose**: Full subscription management interface

**Features**:
- Current subscription details
- Upgrade/downgrade options
- Cancel/reactivate
- Preview costs before changes
- Billing cycle switch

---

### 6. **useSubscriptionActions** (Hook)
**Location**: `src/hooks/useSubscriptionActions.ts`

**Purpose**: Typed API calls for subscription operations

**Functions**:
```typescript
{
  upgradeSubscription: (priceId: string) => Promise<Result>,
  downgradeSubscription: (priceId: string) => Promise<Result>,
  cancelSubscription: () => Promise<Result>,
  reactivateSubscription: () => Promise<Result>,
  previewSubscriptionChange: (priceId: string) => Promise<Result>,
  isLoading: boolean
}
```

---

## Database Schema

### Tables

#### **profiles**
```sql
subscription_tier TEXT DEFAULT 'free',
subscription_status TEXT,
subscription_end TIMESTAMPTZ,
stripe_customer_id TEXT UNIQUE,
stripe_subscription_id TEXT
```

#### **subscription_entitlements**
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES profiles,
tier TEXT NOT NULL,
status TEXT NOT NULL,
stripe_subscription_id TEXT,
current_period_start TIMESTAMPTZ,
current_period_end TIMESTAMPTZ,
cancel_at_period_end BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### **subscription_change_requests**
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES profiles,
from_tier TEXT NOT NULL,
to_tier TEXT NOT NULL,
scheduled_for TIMESTAMPTZ,
status TEXT DEFAULT 'pending',
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### **subscription_audit**
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES profiles,
event_type TEXT NOT NULL,
from_tier TEXT,
to_tier TEXT,
stripe_subscription_id TEXT,
metadata JSONB,
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### **stripe_processed_events**
```sql
id UUID PRIMARY KEY,
stripe_event_id TEXT UNIQUE NOT NULL,
event_type TEXT NOT NULL,
processed_at TIMESTAMPTZ DEFAULT NOW(),
status TEXT DEFAULT 'processed'
```

### Views

#### **v_user_entitlements**
```sql
-- Security Invoker view showing current user's active subscription
SELECT * FROM subscription_entitlements
WHERE user_id = auth.uid()
AND status = 'active';
```

### RLS Policies

All tables have RLS enabled with policies:
- Users can read their own records
- Service role can manage all records
- Webhook processing uses service role

---

## Feature Gates

### Premium Features
1. **FlairsShop** - Custom profile badges
2. **Export Data** - GDPR data export
3. **TrendingHashtags** - Popular tags (logged-in)
4. **WordCloudViz** - Visual word frequency

### VIP Features
1. **AdvancedAnalytics** - Detailed statistics
2. **Leaderboard** - Top users ranking (logged-in)

### Implementation Pattern
```tsx
// In any component
<FeatureGate minTier="premium" teaserPriceHint="$4.99/mo" compact>
  <MyPremiumFeature />
</FeatureGate>
```

---

## Testing

### Test Page
**URL**: `/test-subscriptions`

**Features**:
- Test all edge functions
- View results inline
- Clear visual status
- Comprehensive instructions
- Safe test mode (won't charge real money)

### Test Flow
```
1. Check Subscription → Verify current tier
2. Create Checkout → Get Stripe URL
3. Complete payment (test card: 4242 4242 4242 4242)
4. Confirm payment → Activate subscription
5. Preview Upgrade → See costs
6. Upgrade to VIP → Immediate change
7. Downgrade → Scheduled change
8. Cancel → Cancel at period end
9. Reactivate → Restore subscription
```

### Test Cards (Stripe)
- **Success**: 4242 4242 4242 4242
- **3D Secure**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 0002
- **Insufficient**: 4000 0000 0000 9995

**All cards**: CVV=123, Exp=12/30, ZIP=12345

---

## Deployment

### Pre-Deployment Checklist

#### 1. Stripe Setup
- [ ] Create production price IDs in Stripe Dashboard
- [ ] Update Supabase secrets with production price IDs
- [ ] Update STRIPE_SECRET_KEY to production key
- [ ] Test checkout with real card (then refund)

#### 2. Webhook Configuration
- [ ] Add webhook endpoint: `https://your-domain.supabase.co/functions/v1/stripe-webhook`
- [ ] Select all subscription events
- [ ] Copy webhook signing secret
- [ ] Update STRIPE_WEBHOOK_SECRET in Supabase
- [ ] Test webhook with Stripe CLI

#### 3. Database
- [ ] Run all migrations
- [ ] Verify RLS policies
- [ ] Test with restricted user
- [ ] Check foreign key constraints

#### 4. Testing
- [ ] Complete purchase flow
- [ ] Test upgrade
- [ ] Test downgrade
- [ ] Test cancellation
- [ ] Test reactivation
- [ ] Verify webhook processing
- [ ] Check feature gates
- [ ] Verify coin bonuses

#### 5. Monitoring
- [ ] Set up Stripe webhook monitoring
- [ ] Enable subscription analytics
- [ ] Configure alert for failed payments
- [ ] Track subscription metrics

### Production URLs

**Webhook Endpoint**:
```
https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/stripe-webhook
```

**Test Page**:
```
https://your-domain.com/test-subscriptions
```

---

## Support & Maintenance

### Common Issues

**"Already subscribed" Error**
- User trying to create new checkout with active subscription
- Solution: Use upgrade/downgrade instead

**Subscription Not Syncing**
- Webhook might have failed
- Solution: Use `/test-subscriptions` → "Fix Sync"

**Wrong Tier Displayed**
- Cache or missed webhook
- Solution: Run `check-subscription` or `fix-subscription-sync`

### Monitoring Queries

**Active subscriptions by tier**:
```sql
SELECT subscription_tier, COUNT(*) 
FROM profiles 
WHERE subscription_status = 'active'
GROUP BY subscription_tier;
```

**Recent audit events**:
```sql
SELECT * FROM subscription_audit 
ORDER BY created_at DESC 
LIMIT 100;
```

**Failed webhooks**:
```sql
SELECT * FROM stripe_processed_events 
WHERE status = 'failed' 
ORDER BY processed_at DESC;
```

---

## Documentation Files

- **SUBSCRIPTION_TESTING.md** - Comprehensive testing guide
- **STRIPE_SETUP_GUIDE.md** - Initial setup instructions
- **STRIPE_SUBSCRIPTION_SYSTEM.md** - Architecture details
- **This file** - Complete implementation reference

---

## Summary

✅ **Backend**: 10 edge functions handling all subscription operations
✅ **Frontend**: 6 React components + context + hooks for subscription UI
✅ **Database**: 5 tables + 1 view with complete RLS policies
✅ **Security**: Secrets-based configuration, webhook verification, JWT auth
✅ **Testing**: Dedicated test page with 9 comprehensive tests
✅ **Feature Gates**: 6 premium/VIP features properly gated
✅ **Documentation**: 4 detailed guides covering all aspects

**Status**: Production-ready with test mode. Switch secrets to production when ready to go live! 🚀
