import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";

export const usePremiumStatus = (userId: string | null | undefined) => {
  const { data, isLoading, refetch } = useOptimizedQuery<any>({
    queryKey: ['premium-status', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, subscription_tier, subscription_ends_at, trial_active, trial_end_date, trial_premium_used')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  });

  const premiumStatus = useMemo(() => {
    if (!data) {
      return {
        isPremium: false,
        subscriptionTier: 'free',
        isVIP: false,
        isOnTrial: false,
        trialEndDate: null,
        trialEligible: true, // Default to eligible if no data
      };
    }

    // Check trial status
    const trialActive = data.trial_active || false;
    const trialEndDate = data.trial_end_date;
    const trialValid = trialActive && trialEndDate && new Date(trialEndDate) > new Date();

    const hasActivePremium = data.is_premium || false;
    const tier = data.subscription_tier || 'free';
    const endsAt = data.subscription_ends_at;
    const subscriptionActive = !endsAt || new Date(endsAt) > new Date();

    // Trial eligibility: not used yet AND free tier AND not premium
    const trialEligible = !data.trial_premium_used && tier === 'free' && !hasActivePremium;

    // If on valid trial, treat as Premium
    if (trialValid) {
      return {
        isPremium: true,
        subscriptionTier: 'premium',
        isVIP: false,
        isOnTrial: true,
        trialEndDate,
        trialEligible: false, // Already using trial
        subscriptionEndsAt: endsAt,
      };
    }

    return {
      isPremium: (hasActivePremium || tier !== 'free') && subscriptionActive,
      subscriptionTier: subscriptionActive ? tier : 'free',
      isVIP: subscriptionActive && tier === 'vip',
      isOnTrial: false,
      trialEndDate: null,
      trialEligible,
      subscriptionEndsAt: endsAt,
    };
  }, [data]);

  return {
    ...premiumStatus,
    isLoading,
    refetch,
  };
};
