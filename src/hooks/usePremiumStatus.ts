import { useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";

export const usePremiumStatus = (userId: string | null | undefined) => {
  const { data, isLoading, refetch } = useOptimizedQuery<any>({
    queryKey: ['premium-status', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch both profile and entitlement data
      const [profileResult, entitlementResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_premium, subscription_tier, subscription_ends_at, trial_active, trial_end_date, trial_premium_used, subscription_status')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('subscription_entitlements')
          .select('tier, valid_until')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (profileResult.error) throw profileResult.error;

      // Merge profile and entitlement data, preferring entitlement data
      const profile = profileResult.data;
      const entitlement = entitlementResult.data;

      return {
        ...profile,
        // Override with entitlement data if available
        subscription_tier: entitlement?.tier || profile?.subscription_tier,
        subscription_ends_at: entitlement?.valid_until || profile?.subscription_ends_at,
        is_premium: entitlement?.tier && entitlement.tier !== 'free' 
          ? true 
          : profile?.is_premium || false,
      };
    },
    enabled: !!userId,
    cacheTTL: 30 * 60 * 1000, // 30 minutes cache - subscription status doesn't change often
    staleTime: 15 * 60 * 1000, // 15 minutes stale time - rely on realtime updates for changes
    cacheKey: `premium-${userId}`,
    useCircuitBreaker: true,
    useDedupe: true,
  });

  // Real-time subscription to profile changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
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
          console.log('[usePremiumStatus] Profile updated, refetching...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const premiumStatus = useMemo(() => {
    if (!data) {
      return {
        isPremium: false,
        subscriptionTier: 'free',
        isVIP: false,
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

    const hasActivePremium = data.is_premium || false;
    const tier = data.subscription_tier || 'free';
    const endsAt = data.subscription_ends_at;
    const subscriptionActive = !endsAt || new Date(endsAt) > new Date();

    // Trial eligibility: not used yet AND free tier
    const trialEligible = !data.trial_premium_used && tier === 'free' && !hasActivePremium;

    // If on valid trial, treat as VIP (no longer Premium)
    if (trialValid) {
      return {
        isPremium: true, // Keep for backwards compatibility
        subscriptionTier: 'vip',
        isVIP: true,
        isOnTrial: true,
        trialEndDate,
        trialEligible: false,
        subscriptionEndsAt: endsAt,
        uiMode: 'vip' as const,
      };
    }

    const isPremiumUser = (hasActivePremium || tier !== 'free') && subscriptionActive;
    const currentTier = subscriptionActive ? tier : 'free';
    const isVIPUser = subscriptionActive && tier === 'vip';

    return {
      isPremium: isPremiumUser, // Keep for backwards compatibility  
      subscriptionTier: currentTier,
      isVIP: isVIPUser,
      isOnTrial: false,
      trialEndDate: null,
      trialEligible,
      subscriptionEndsAt: endsAt,
      uiMode: (isPremiumUser || isVIPUser) ? 'vip' as const : 'free' as const,
    };
  }, [data]);

  return {
    ...premiumStatus,
    isLoading,
    refetch,
  };
};
