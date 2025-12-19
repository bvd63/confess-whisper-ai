import { useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";
import { logDebug } from "@/lib/logger";

/**
 * Hook to check VIP subscription status for a user.
 * Returns both isVip (new) and isPremium (deprecated but kept for backwards compatibility)
 * @deprecated Use isVip instead of isPremium in new code
 */
export const useVipStatus = (userId: string | null | undefined) => {
  const { data, isLoading, refetch } = useOptimizedQuery<any>({
    queryKey: ['vip-status', userId],
    queryFn: async () => {
      if (!userId) return null;

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || authUser.id !== userId) {
        return null;
      }

      // Optimized: Single query to profiles (entitlements are fallback only)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_premium, subscription_tier, subscription_ends_at, trial_active, trial_end_date, trial_premium_used, subscription_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      // Only check entitlements if profile data is missing/incomplete
      if (!profile || (!profile.subscription_tier && !profile.is_premium)) {
        const { data: entitlement } = await supabase
          .from('subscription_entitlements')
          .select('tier, valid_until')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (entitlement) {
          return {
            ...profile,
            subscription_tier: entitlement.tier,
            subscription_ends_at: entitlement.valid_until,
            is_premium: entitlement.tier && entitlement.tier !== 'free',
          };
        }
      }

      return profile;
    },
    enabled: !!userId,
    cacheTTL: 30 * 60 * 1000, // 30 minutes cache
    staleTime: 15 * 60 * 1000, // 15 minutes stale time
    cacheKey: `vip-${userId}`,
    useCircuitBreaker: true,
    useDedupe: true,
  });

  // Real-time subscription to profile changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      if (!userId) return;
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || authUser.id !== userId) return;

      channel = supabase
        .channel(`profile-changes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            logDebug('[useVipStatus] Profile updated, refetching');
            refetch();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, refetch]);

  const vipStatus = useMemo(() => {
    if (!data) {
      return {
        isVip: false,
        isPremium: false, // Deprecated
        subscriptionTier: 'free' as const,
        isOnTrial: false,
        trialEndDate: null,
        trialEligible: true, // Default to eligible if no data
        uiMode: 'free' as const,
      };
    }

    // Check trial status
    const trialActive = data.trial_active || false;
    const trialEndDate = data.trial_end_date;
    const trialValid = trialActive && trialEndDate && new Date(trialEndDate) > new Date();

    const hasActiveVip = data.is_premium || false;
    const tier = data.subscription_tier || 'free';
    const endsAt = data.subscription_ends_at;
    const subscriptionActive = !endsAt || new Date(endsAt) > new Date();

    // Trial eligibility: not used yet AND free tier
    const trialEligible = !data.trial_premium_used && tier === 'free' && !hasActiveVip;

    // If on valid trial, treat as VIP
    if (trialValid) {
      return {
        isVip: true,
        isPremium: true, // Deprecated - kept for backwards compatibility
        subscriptionTier: 'vip' as const,
        isOnTrial: true,
        trialEndDate,
        trialEligible: false,
        subscriptionEndsAt: endsAt,
        uiMode: 'vip' as const,
      };
    }

    const isVipUser = subscriptionActive && tier === 'vip';
    const isPremiumUser = (hasActiveVip || tier !== 'free') && subscriptionActive;
    const currentTier = subscriptionActive ? (tier as 'free' | 'vip') : 'free' as const;

    return {
      isVip: isVipUser,
      isPremium: isPremiumUser, // Deprecated - kept for backwards compatibility
      subscriptionTier: currentTier,
      isOnTrial: false,
      trialEndDate: null,
      trialEligible,
      subscriptionEndsAt: endsAt,
      subscriptionStatus: data.subscription_status || 'none',
      uiMode: (isVipUser || isPremiumUser) ? 'vip' as const : 'free' as const,
    };
  }, [data]);

  return {
    ...vipStatus,
    isLoading,
    refetch,
  };
};

// Backwards compatibility alias
export const usePremiumStatus = useVipStatus;
