export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: 'free' | 'premium' | 'vip';
  name: string;
  priceMonthly: number;
  priceYearly?: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly?: string;
  isPopular?: boolean;
  benefits: string[];
  limitations?: string[];
}

export interface PlanWithInterval extends SubscriptionPlan {
  interval: BillingInterval;
  price: number;
  priceId: string;
  savingsPercent?: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceIdMonthly: '',
    benefits: [
      'subscription_benefits_free_confessions',
      'subscription_benefits_free_basic_features',
      'subscription_benefits_free_community_access',
    ],
    limitations: [
      'subscription_limitations_free_ads',
      'subscription_limitations_free_limited_ai',
      'subscription_limitations_free_basic_analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 9.99,
    priceYearly: 99.99, // ~17% savings
    stripePriceIdMonthly: 'price_1SJ0vvR7kygIyYg9oT1ju6lQ',
    stripePriceIdYearly: 'price_1SJ0vvR7kygIyYg9yORadPGD',
    isPopular: true,
    benefits: [
      'subscription_benefits_premium_more_confessions',
      'subscription_benefits_premium_unlimited_ai',
      'subscription_benefits_premium_advanced_analytics',
      'subscription_benefits_premium_exclusive_badges',
      'subscription_benefits_premium_no_ads',
      'subscription_benefits_premium_priority_moderation',
      'subscription_benefits_premium_image_confessions',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceMonthly: 19.99,
    priceYearly: 199.99, // ~17% savings
    stripePriceIdMonthly: 'price_1SJ0vwR7kygIyYg9OeCiqV00',
    stripePriceIdYearly: 'price_1SJ0vvR7kygIyYg9BJuciYGd',
    benefits: [
      'subscription_benefits_vip_unlimited_confessions',
      'subscription_benefits_vip_all_premium',
      'subscription_benefits_vip_detailed_statistics',
      'subscription_benefits_vip_priority_support',
      'subscription_benefits_vip_special_badge',
      'subscription_benefits_vip_early_access',
      'subscription_benefits_vip_custom_themes',
    ],
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

export function canUpgradeTo(currentPlan: string, targetPlan: string): boolean {
  const plans = ['free', 'premium', 'vip'];
  const currentIndex = plans.indexOf(currentPlan);
  const targetIndex = plans.indexOf(targetPlan);
  return targetIndex > currentIndex;
}

export function canDowngradeTo(currentPlan: string, targetPlan: string): boolean {
  const plans = ['free', 'premium', 'vip'];
  const currentIndex = plans.indexOf(currentPlan);
  const targetIndex = plans.indexOf(targetPlan);
  return targetIndex < currentIndex && currentIndex > 0;
}

export function calculateSavings(monthlyPrice: number, yearlyPrice: number): number {
  if (monthlyPrice === 0 || yearlyPrice === 0) return 0;
  const annualMonthly = monthlyPrice * 12;
  if (yearlyPrice >= annualMonthly) return 0;
  return Math.round(((annualMonthly - yearlyPrice) / annualMonthly) * 100);
}

export function getPlansForInterval(interval: BillingInterval): PlanWithInterval[] {
  return SUBSCRIPTION_PLANS.filter(plan => {
    const hasInterval = interval === 'monthly' 
      ? plan.stripePriceIdMonthly 
      : plan.stripePriceIdYearly;
    return hasInterval;
  }).map(plan => {
    const isYearly = interval === 'yearly';
    const price = isYearly ? (plan.priceYearly ?? plan.priceMonthly) : plan.priceMonthly;
    const priceId = isYearly ? (plan.stripePriceIdYearly ?? plan.stripePriceIdMonthly) : plan.stripePriceIdMonthly;
    
    const savingsPercent = isYearly && plan.priceYearly && plan.priceMonthly
      ? calculateSavings(plan.priceMonthly, plan.priceYearly)
      : undefined;
    
    return {
      ...plan,
      interval,
      price,
      priceId,
      savingsPercent,
    };
  });
}

export function hasInterval(planId: string, interval: BillingInterval): boolean {
  const plan = getPlanById(planId);
  if (!plan) return false;
  return interval === 'monthly' 
    ? !!plan.stripePriceIdMonthly 
    : !!plan.stripePriceIdYearly;
}
