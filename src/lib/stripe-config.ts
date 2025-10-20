/**
 * Stripe Configuration - Single Source of Truth
 * All Stripe price IDs and subscription tiers
 */

export const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SKGCzR7kygIyYg9DGRcT8Pg",
  premium_yearly: "price_1SKGCzR7kygIyYg9DGRcT8Pg", // Same as monthly for now
  vip_monthly: "price_1SKH1TR7kygIyYg9SZ2iH7Kw",
  vip_yearly: "price_1SKH1TR7kygIyYg9SZ2iH7Kw", // Same as monthly for now
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  VIP: 'vip',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type BillingCycle = 'monthly' | 'yearly';

export const getPriceIdForTier = (tier: SubscriptionTier, cycle: BillingCycle = 'monthly'): string | null => {
  if (tier === 'free') return null;
  
  const key = `${tier}_${cycle}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key] || null;
};
