export type SubscriptionTier = "vip" | "premium" | "free";

export interface PriceEnvConfig {
  vipMonthly?: string | null;
  vipYearly?: string | null;
  premiumMonthly?: string | null;
  premiumYearly?: string | null;
}

export interface SubscriptionRecordInput {
  userId: string;
  subscriptionId: string;
  customerId: string;
  status?: string | null;
  tier: SubscriptionTier;
  cadence: "monthly" | "yearly";
  priceId?: string | null;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: number | null;
}

export interface DuplicateEventErrorLike {
  code?: string | number | null;
}

export const VIP_BONUS_TYPE = "subscription_bonus";
export const VIP_BONUS_DESCRIPTION = "VIP Welcome Bonus";
export const VIP_BONUS_AMOUNT = 250;

const DUPLICATE_ERROR_CODES = new Set(["23505", "unique_violation"]);

const normalizeEnvValue = (value?: string | null) => (value && value.length > 0 ? value : null);

export const resolveTier = (priceId: string | undefined, env: PriceEnvConfig): SubscriptionTier => {
  if (!priceId) return "free";
  const normalizedPrice = normalizeEnvValue(priceId);
  if (!normalizedPrice) return "free";

  const vipPrices = [env.vipMonthly, env.vipYearly].map(normalizeEnvValue);
  if (vipPrices.includes(normalizedPrice)) {
    return "vip";
  }

  const premiumPrices = [env.premiumMonthly, env.premiumYearly].map(normalizeEnvValue);
  if (premiumPrices.includes(normalizedPrice)) {
    return "premium";
  }

  return "free";
};

export const deriveCadence = (interval: string | null | undefined): "monthly" | "yearly" =>
  interval === "year" ? "yearly" : "monthly";

export const stripeTimestampToIso = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return new Date(value * 1000).toISOString();
};

export const buildSubscriptionRecord = ({
  userId,
  subscriptionId,
  customerId,
  status,
  tier,
  cadence,
  priceId,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  canceledAt,
}: SubscriptionRecordInput) => ({
  user_id: userId,
  stripe_customer_id: customerId,
  stripe_subscription_id: subscriptionId,
  status: status ?? null,
  tier,
  cadence,
  price_id: priceId ?? "",
  current_period_start: stripeTimestampToIso(currentPeriodStart),
  current_period_end: stripeTimestampToIso(currentPeriodEnd),
  cancel_at_period_end: Boolean(cancelAtPeriodEnd),
  canceled_at: stripeTimestampToIso(canceledAt) ?? null,
});

export const isDuplicateEventError = (error: DuplicateEventErrorLike | null | undefined): boolean => {
  if (!error || error.code === undefined || error.code === null) return false;
  return DUPLICATE_ERROR_CODES.has(String(error.code));
};

export const shouldAwardBonus = (tier: SubscriptionTier, hasExistingBonus: boolean): boolean =>
  tier === "vip" && !hasExistingBonus;
