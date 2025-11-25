type VipPriceVariant = "vipMonthly" | "vipYearly";

const PRICE_SOURCES: Record<VipPriceVariant, { label: string; keys: string[] }> = {
  vipMonthly: {
    label: "VIP monthly price ID",
    keys: [
      "STRIPE_PRICE_VIP_MONTHLY",
      "PRICE_VIP_MONTHLY",
      "VITE_STRIPE_PRICE_VIP_MONTHLY",
      "VITE_STRIPE_PRICE_VIP_MONTH_ID",
    ],
  },
  vipYearly: {
    label: "VIP yearly price ID",
    keys: [
      "STRIPE_PRICE_VIP_YEARLY",
      "PRICE_VIP_YEARLY",
      "VITE_STRIPE_PRICE_VIP_YEARLY",
      "VITE_STRIPE_PRICE_VIP_YEAR_ID",
    ],
  },
};

const priceCache = new Map<VipPriceVariant, string>();

const resolveStripePriceId = (variant: VipPriceVariant): string => {
  if (priceCache.has(variant)) {
    return priceCache.get(variant)!;
  }

  const source = PRICE_SOURCES[variant];

  for (const key of source.keys) {
    const value = key ? Deno.env.get(key) : undefined;
    if (value) {
      priceCache.set(variant, value);
      return value;
    }
  }

  throw new Error(`Missing ${source.label}. Configure one of: ${source.keys.join(", ")}`);
};

export const getVipMonthlyPriceId = (): string => resolveStripePriceId("vipMonthly");
export const getVipYearlyPriceId = (): string => resolveStripePriceId("vipYearly");

export const isVipPriceId = (priceId?: string | null): boolean => {
  if (!priceId) return false;
  return priceId === getVipMonthlyPriceId() || priceId === getVipYearlyPriceId();
};

export const getVipPriceIds = () => ({
  monthly: getVipMonthlyPriceId(),
  yearly: getVipYearlyPriceId(),
});
