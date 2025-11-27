export type SubscriptionTier = 'free' | 'vip';

export const FREE_DAILY_CONFESSION_LIMIT = 5 as const;
export const VIP_DAILY_CONFESSION_LIMIT = Infinity as const;

export const getDailyConfessionLimitForTier = (tier: SubscriptionTier): number =>
  tier === 'vip' ? VIP_DAILY_CONFESSION_LIMIT : FREE_DAILY_CONFESSION_LIMIT;

export const canPostMoreConfessions = (
  tier: SubscriptionTier,
  currentCount: number,
): boolean => {
  const limit = getDailyConfessionLimitForTier(tier);
  if (limit === Infinity) return true;
  return currentCount < limit;
};
