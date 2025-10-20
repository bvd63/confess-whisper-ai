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

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    stripePriceIdMonthly: '',
    benefits: [
      'subscription.benefits.free.confessions',
      'subscription.benefits.free.basic_features',
      'subscription.benefits.free.community_access',
    ],
    limitations: [
      'subscription.limitations.free.ads',
      'subscription.limitations.free.limited_ai',
      'subscription.limitations.free.basic_analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 9.99,
    stripePriceIdMonthly: 'price_1SKGCzR7kygIyYg9DGRcT8Pg',
    isPopular: true,
    benefits: [
      'subscription.benefits.premium.more_confessions',
      'subscription.benefits.premium.unlimited_ai',
      'subscription.benefits.premium.advanced_analytics',
      'subscription.benefits.premium.exclusive_badges',
      'subscription.benefits.premium.no_ads',
      'subscription.benefits.premium.priority_moderation',
      'subscription.benefits.premium.image_confessions',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    priceMonthly: 19.99,
    stripePriceIdMonthly: 'price_1SKH1TR7kygIyYg9SZ2iH7Kw',
    benefits: [
      'subscription.benefits.vip.unlimited_confessions',
      'subscription.benefits.vip.all_premium',
      'subscription.benefits.vip.detailed_statistics',
      'subscription.benefits.vip.priority_support',
      'subscription.benefits.vip.special_badge',
      'subscription.benefits.vip.early_access',
      'subscription.benefits.vip.custom_themes',
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
