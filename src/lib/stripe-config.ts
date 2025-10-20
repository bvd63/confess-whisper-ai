/**
 * Stripe Configuration - Single Source of Truth
 * All Stripe price IDs and subscription tiers
 */

export const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",
  premium_yearly: "price_1SJ0vvR7kygIyYg9yORadPGD",
  vip_monthly: "price_1SJ0vwR7kygIyYg9OeCiqV00",
  vip_yearly: "price_1SJ0vvR7kygIyYg9BJuciYGd",
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
