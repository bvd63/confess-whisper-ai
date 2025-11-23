import { createContext } from "react";

export type SubscriptionTier = "free" | "vip";
export type SubscriptionCadence = "monthly" | "yearly";

export interface Entitlements {
  user_id: string;
  tier: SubscriptionTier;
  cadence: SubscriptionCadence;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  is_pro: boolean;
  is_vip: boolean;
}

export interface SubscriptionContextValue {
  entitlements: Entitlements | null;
  loading: boolean;
  setOptimisticTier: (tier: SubscriptionTier) => void;
}

export const SubscriptionContext = createContext<SubscriptionContextValue>({
  entitlements: null,
  loading: true,
  setOptimisticTier: () => {},
});
