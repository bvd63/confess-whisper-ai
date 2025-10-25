/**
 * Stripe Configuration - Single Source of Truth
 * All Stripe price IDs and subscription tiers
 */

export const STRIPE_PRICE_IDS = {
  vip_monthly: "price_1SJ0vwR7kygIyYg9OeCiqV00",
  vip_yearly: "price_1SJ0vvR7kygIyYg9BJuciYGd",
} as const;

// Direct Stripe payment link for VIP subscription
export const STRIPE_VIP_CHECKOUT_URL = "https://buy.stripe.com/test_9B600lewecBRavrfcG0Ba00";

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
