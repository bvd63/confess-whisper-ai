export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: 'free' | 'vip';
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
    stripePriceIdMonthly: 'free',
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
    id: 'vip',
    name: 'VIP',
    priceMonthly: 6.99,
    priceYearly: 54.99, // 35% savings
    stripePriceIdMonthly: 'vip_monthly',
    stripePriceIdYearly: 'vip_yearly',
    isPopular: true,
    benefits: [
      'subscription_benefits_vip_unlimited_confessions',
      'subscription_benefits_vip_no_ads',
      'subscription_benefits_vip_custom_themes',
      'subscription_benefits_vip_private_confessions',
      'subscription_benefits_vip_advanced_stats',
      'subscription_benefits_vip_special_badge',
      'subscription_benefits_vip_unlimited_ai',
      'subscription_benefits_vip_priority_ai',
      'subscription_benefits_vip_priority_support',
      'subscription_benefits_vip_coins_bonus',
      'subscription_benefits_vip_login_rewards',
    ],
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

export function canUpgradeTo(currentPlan: string, targetPlan: string): boolean {
  const plans = ['free', 'vip'];
  const currentIndex = plans.indexOf(currentPlan);
  const targetIndex = plans.indexOf(targetPlan);
  return targetIndex > currentIndex;
}

export function canDowngradeTo(currentPlan: string, targetPlan: string): boolean {
  // Only from VIP to free
  return currentPlan === 'vip' && targetPlan === 'free';
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
