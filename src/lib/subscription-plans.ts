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
    stripePriceIdMonthly: '',
    benefits: [
      'Basic features',
      'Limited daily confessions',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceMonthly: 5.99,
    priceYearly: 49.99,
    stripePriceIdMonthly: 'vip_monthly',
    stripePriceIdYearly: 'vip_yearly',
    isPopular: true,
    benefits: [
      'All premium features',
      'Priority AI responses',
      'VIP Reflection Feed',
      'Double coins for streaks',
      'Instant 250 coins on first purchase',
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
