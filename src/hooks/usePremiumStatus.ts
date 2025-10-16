import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePremiumStatus = (userId: string | null | undefined) => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkPremiumStatus();
    } else {
      setIsPremium(false);
      setSubscriptionTier('free');
      setIsLoading(false);
    }
  }, [userId]);

  const checkPremiumStatus = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, subscription_tier, subscription_ends_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      // Check if subscription is active
      const hasActivePremium = data?.is_premium || false;
      const tier = data?.subscription_tier || 'free';
      const endsAt = data?.subscription_ends_at;

      // If there's an end date, check if it's in the future
      const isActive = !endsAt || new Date(endsAt) > new Date();

      setIsPremium((hasActivePremium || tier !== 'free') && isActive);
      setSubscriptionTier(isActive ? tier : 'free');
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
      setSubscriptionTier('free');
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    isPremium, 
    subscriptionTier,
    isVIP: subscriptionTier === 'vip',
    isLoading, 
    refetch: checkPremiumStatus 
  };
};
