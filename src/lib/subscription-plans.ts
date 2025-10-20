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
    stripePriceIdMonthly: 'price_1SKGCzR7kygIyYg9DGRcT8Pg',
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
    stripePriceIdMonthly: 'price_1SKH1TR7kygIyYg9SZ2iH7Kw',
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
