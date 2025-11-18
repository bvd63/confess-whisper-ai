# ConfessAI Deployment Checklist

## Environment Variables

Ensure all the following environment variables are configured:

### Supabase

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_URL` - Same as VITE_SUPABASE_URL (for edge functions)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for edge functions)
- `VITE_SUPABASE_FUNCTIONS_URL` - Edge functions URL

### Stripe

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `VITE_STRIPE_PRICE_VIP_MONTH_ID` - VIP monthly price ID (frontend)
- `VITE_STRIPE_PRICE_VIP_YEAR_ID` - VIP yearly price ID (frontend)
- `PRICE_VIP_MONTHLY` - VIP monthly price ID (backend allowlist)
- `PRICE_VIP_YEARLY` - VIP yearly price ID (backend allowlist)
- `PRICE_PREMIUM_MONTHLY` / `PRICE_PREMIUM_YEARLY` - Legacy premium prices if still required
- `STRIPE_WEBHOOK_TOLERANCE_SECONDS` - (Optional) signature freshness window override

### Lovable AI

- `LOVABLE_API_KEY` - Lovable AI gateway key (auto-configured)

### App

- `VITE_APP_ENV` - Environment (local/staging/production)

## Stripe Configuration

### Products and Prices

- **VIP Monthly**: $6.99/month
- **VIP Yearly**: $54.99/year
- Ensure price IDs are set in environment variables

### Webhooks

Configure the following webhook events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### API Version

- Pinned to `2024-06-20` in all edge functions

## Supabase Edge Functions

Deploy the following functions:

- `ai-confession-response` - AI text responses with VIP priority
- `award-streak-bonus` - Streak milestone coin rewards

### Database Functions

Ensure the following RPC is available:

- `award_coins(p_user_id, p_amount, p_session_id, p_description)` - Award coins idempotently

### Row Level Security

Review and verify RLS policies are correctly configured for:

- User profiles
- Confessions
- Coin transactions
- Subscription entitlements

## Tests

### VIP-Only Migration

- ✓ All Premium references removed
- ✓ Only FREE and VIP tiers visible
- ✓ Plan cards show correct pricing ($6.99/mo, $54.99/yr)

### Subscription Flows

- ✓ `subscription.upgrade.spec.ts` - Instant upgrade to VIP from Free
- ✓ `subscription.downgrade.spec.ts` - Downgrade applies at end-of-period
- ✓ `subscription.reactivate.spec.ts` - Reactivation flow for VIP

### Coins & Rewards

- ✓ `coins.awardFirstVip.spec.ts` - 250 coins awarded on first VIP payment
- ✓ `streak.bonus.spec.ts` - 10/20/50 coins for 3/5/7 day streaks

## Quality Assurance

### VIP Features

- [ ] VIP gating works correctly (guards in place)
- [ ] VIP Reflection Feed accessible only to VIP users
- [ ] AI responses show priority for VIP (longer, more consistent)
- [ ] Double coins for streaks active for VIP users
- [ ] 250 coins awarded on first VIP purchase

### Localization

- [ ] English (EN) translations complete
- [ ] Spanish (ES) translations complete
- [ ] German (DE) translations complete

### UI/UX

- [ ] Subscription plans display correctly (2 tiers)
- [ ] VIP badge displays properly
- [ ] Toast notifications work for streak bonuses
- [ ] Paywall flows tested

## Pre-Launch

- [ ] Run full test suite
- [ ] Verify all environment variables in production
- [ ] Test Stripe checkout flow end-to-end
- [ ] Verify webhook handling
- [ ] Test VIP feature access
- [ ] Verify coin award mechanics
- [ ] Test all three languages (EN/ES/DE)
- [ ] Performance testing
- [ ] Security review (RLS policies, auth flows)

## Post-Launch

- [ ] Monitor error logs
- [ ] Track subscription conversions
- [ ] Monitor AI API usage
- [ ] Track coin economy metrics
- [ ] User feedback collection
