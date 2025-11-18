import {
  buildStripeMonitorPayload,
  emitStripeMonitorEvent,
  type StripeMonitorComponent,
  type StripeMonitorPayload,
} from "./stripe-monitoring.ts";

const PRIMARY_PRICE_ENV_KEYS = [
  "PRICE_VIP_MONTHLY",
  "PRICE_VIP_YEARLY",
  "PRICE_PREMIUM_MONTHLY",
  "PRICE_PREMIUM_YEARLY",
] as const;

const LEGACY_PRICE_ENV_KEYS = [
  "STRIPE_PRICE_VIP_MONTHLY",
  "STRIPE_PRICE_VIP_YEARLY",
  "STRIPE_PRICE_PREMIUM_MONTHLY",
  "STRIPE_PRICE_PREMIUM_YEARLY",
] as const;

export const ALL_PRICE_ENV_KEYS = [...PRIMARY_PRICE_ENV_KEYS, ...LEGACY_PRICE_ENV_KEYS] as const;

const TIERED_PRICE_ENV_KEYS: Array<{ key: (typeof ALL_PRICE_ENV_KEYS)[number]; tier: PriceTier }> = [
  { key: "PRICE_VIP_MONTHLY", tier: "vip" },
  { key: "PRICE_VIP_YEARLY", tier: "vip" },
  { key: "STRIPE_PRICE_VIP_MONTHLY", tier: "vip" },
  { key: "STRIPE_PRICE_VIP_YEARLY", tier: "vip" },
  { key: "PRICE_PREMIUM_MONTHLY", tier: "premium" },
  { key: "PRICE_PREMIUM_YEARLY", tier: "premium" },
  { key: "STRIPE_PRICE_PREMIUM_MONTHLY", tier: "premium" },
  { key: "STRIPE_PRICE_PREMIUM_YEARLY", tier: "premium" },
];

export type PriceTier = "vip" | "premium";

export type EnvGetter = (key: string) => string | undefined | null;

const normalizeEnvValue = (value: string | undefined | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export interface PriceGuardContext {
  component: StripeMonitorComponent;
  action: string;
  correlationId?: string | null;
}

export type PriceGuardDecisionReason = "allowed" | "missing_price_id" | "not_allowlisted";

export interface PriceGuardDecision {
  allowed: boolean;
  normalizedPriceId: string | null;
  reason: PriceGuardDecisionReason;
  context: PriceGuardContext;
  monitorPayload: StripeMonitorPayload;
}

export const collectStripePriceIds = (getEnv: EnvGetter): string[] => {
  const ids: string[] = [];
  for (const key of ALL_PRICE_ENV_KEYS) {
    const value = normalizeEnvValue(getEnv(key));
    if (value) {
      ids.push(value);
    }
  }
  return ids;
};

export const buildPriceAllowlist = (getEnv: EnvGetter): ReadonlySet<string> => {
  const ids = collectStripePriceIds(getEnv);
  return new Set(ids);
};

export const isAllowedPriceId = (
  priceId: string | null | undefined,
  allowlist: ReadonlySet<string>,
): boolean => {
  const normalized = normalizeEnvValue(priceId ?? null);
  if (!normalized) return false;
  return allowlist.has(normalized);
};

export const buildPriceTierMap = (getEnv: EnvGetter): ReadonlyMap<string, PriceTier> => {
  const map = new Map<string, PriceTier>();
  for (const { key, tier } of TIERED_PRICE_ENV_KEYS) {
    const value = normalizeEnvValue(getEnv(key));
    if (value) {
      map.set(value, tier);
    }
  }
  return map;
};

export const resolveTierFromPriceMap = (
  priceId: string | null | undefined,
  map: ReadonlyMap<string, PriceTier>,
): PriceTier | null => {
  const normalized = normalizeEnvValue(priceId ?? null);
  if (!normalized) return null;
  return map.get(normalized) ?? null;
};

export const evaluatePriceGuardDecision = (
  priceId: string | null | undefined,
  allowlist: ReadonlySet<string>,
  context: PriceGuardContext,
): PriceGuardDecision => {
  const normalizedPriceId = normalizeEnvValue(priceId ?? null);
  let reason: PriceGuardDecisionReason = "allowed";
  let allowed = true;

  if (!normalizedPriceId) {
    allowed = false;
    reason = "missing_price_id";
  } else if (!allowlist.has(normalizedPriceId)) {
    allowed = false;
    reason = "not_allowlisted";
  }

  const monitorPayload = buildStripeMonitorPayload({
    component: context.component,
    event: "price_allowlist",
    severity: allowed ? "info" : "error",
    correlationId: context.correlationId ?? null,
    metadata: {
      action: context.action,
      priceId: normalizedPriceId,
      allowed,
      reason,
    },
  });

  return {
    allowed,
    normalizedPriceId,
    reason,
    context,
    monitorPayload,
  };
};

export const emitPriceGuardDecision = (
  priceId: string | null | undefined,
  allowlist: ReadonlySet<string>,
  context: PriceGuardContext,
) => {
  const decision = evaluatePriceGuardDecision(priceId, allowlist, context);
  emitStripeMonitorEvent(decision.monitorPayload);
  return decision;
};
