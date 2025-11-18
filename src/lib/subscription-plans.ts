import { STRIPE_PRICE } from './stripe-config';

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
      '5 confessions per day',
      'Basic AI responses',
      'Standard support',
      'Basic badges & achievements',
      'Public confessions only',
      'Standard coin rewards',
      'Community access',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceMonthly: 6.99,
    priceYearly: 54.99,
    stripePriceIdMonthly: STRIPE_PRICE.VIP_MONTHLY,
    stripePriceIdYearly: STRIPE_PRICE.VIP_YEARLY,
    isPopular: true,
    benefits: [
      'Unlimited daily confessions',
      'Priority AI responses & insights',
      'Double coins for streaks',
      '250 coins bonus on signup',
      'Private confessions feature',
      'Exclusive VIP badges & flairs',
      'Advanced analytics dashboard',
      'Early access to new features',
      'Priority customer support',
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
  return SUBSCRIPTION_PLANS.map(plan => {
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
