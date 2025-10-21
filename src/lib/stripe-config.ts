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
 * Stripe Price IDs - UPDATE THESE WITH YOUR ACTUAL STRIPE PRICE IDs
 * 
 * Current IDs are examples - replace with your actual Price IDs from Stripe Dashboard
 * Get them from: Stripe Dashboard → Products → [Your Product] → Pricing
 */
export const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",  // Replace with your Premium Monthly Price ID
  premium_yearly: "price_1SJ0vvR7kygIyYg9yORadPGD",   // Replace with your Premium Yearly Price ID
  vip_monthly: "price_1SJ0vwR7kygIyYg9OeCiqV00",      // Replace with your VIP Monthly Price ID
  vip_yearly: "price_1SJ0vvR7kygIyYg9BJuciYGd",       // Replace with your VIP Yearly Price ID
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
