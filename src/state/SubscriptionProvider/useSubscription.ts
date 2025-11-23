import { useEntitlements } from "./useEntitlements";

export const useSubscription = () => {
  const { entitlements, loading, setOptimisticTier } = useEntitlements();

  return {
    subscriptionTier: entitlements?.tier || "free",
    subscriptionStatus: entitlements?.status,
    subscriptionEnd: entitlements?.current_period_end,
    billingCycle: entitlements?.cadence,
    cancelAtPeriodEnd: entitlements?.cancel_at_period_end,
    isPremium: entitlements?.is_pro ?? false,
    isVip: entitlements?.is_vip ?? false,
    isLoading: loading,
    setOptimisticTier,
  };
};
