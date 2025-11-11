/**
 * Stripe Configuration - Single Source of Truth
 * All Stripe price IDs and subscription tiers from environment variables
 */
import { env } from '@/lib/env';

// Read Stripe configuration from environment variables
export const STRIPE_PRICE = {
  VIP_MONTHLY: env.client.stripePriceVipMonthId,
  VIP_YEARLY: env.client.stripePriceVipYearId,
};

export const STRIPE_CONFIG = {
  SECRET_KEY: import.meta.env.VITE_STRIPE_SECRET_KEY,
  WEBHOOK_SECRET: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET,
  CHECKOUT_URL: import.meta.env.VITE_STRIPE_VIP_CHECKOUT_URL,
};

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  VIP: 'vip',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type BillingCycle = 'monthly' | 'yearly';

export const getPriceIdForTier = (tier: SubscriptionTier, cycle: BillingCycle = 'monthly'): string | null => {
  if (tier === 'free') return null;
  if (tier === 'vip') {
    return cycle === 'yearly' ? STRIPE_PRICE.VIP_YEARLY : STRIPE_PRICE.VIP_MONTHLY;
  }
  return null;
};
