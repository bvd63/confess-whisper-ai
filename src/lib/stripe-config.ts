/**
 * Stripe Configuration - Single Source of Truth
 * All Stripe price IDs and subscription tiers
 * 
 * See docs/STRIPE_SETUP_GUIDE.md for complete setup instructions.
 */

/**
 * Stripe Publishable Key (safe for client-side use)
 * Configure in .env file: VITE_STRIPE_PUBLISHABLE_KEY
 */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

/**
 * Stripe Price IDs - Dynamically loaded from backend
 * These are managed via Supabase secrets and should not be hardcoded
 * 
 * Note: The actual price IDs are stored as secrets in the backend
 * and are accessed via edge functions for security
 */
export const STRIPE_PRICE_IDS = {
  vip_monthly: "",      // Loaded from backend via edge functions
  vip_yearly: "",       // Loaded from backend via edge functions
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  VIP: 'vip',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type BillingCycle = 'monthly' | 'yearly';

export const getPriceIdForTier = (tier: SubscriptionTier, cycle: BillingCycle = 'monthly'): string | null => {
  if (tier === 'free') return null;
  
  const key = `${tier}_${cycle}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key] || null;
};

/**
 * Validate Stripe configuration
 * Checks if all required keys are set
 */
export const validateStripeConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check publishable key
  if (!STRIPE_PUBLISHABLE_KEY) {
    errors.push('❌ VITE_STRIPE_PUBLISHABLE_KEY is not set. Add it to your .env file.');
    errors.push('   Get your key from: https://dashboard.stripe.com/test/apikeys');
  } else if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('❌ VITE_STRIPE_PUBLISHABLE_KEY must start with "pk_test_" or "pk_live_"');
  }
  
  // Check if Price IDs look valid (should start with "price_")
  Object.entries(STRIPE_PRICE_IDS).forEach(([key, value]) => {
    if (!value.startsWith('price_')) {
      errors.push(`⚠️ Price ID for ${key} doesn't look valid. Should start with "price_"`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get Stripe setup guide URL
 */
export const STRIPE_SETUP_GUIDE = '/docs/STRIPE_SETUP_GUIDE.md';
