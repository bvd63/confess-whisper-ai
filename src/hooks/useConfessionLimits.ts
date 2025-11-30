import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { useVipStatus } from "./usePremiumStatus";
import { logError } from "@/lib/logger";
import { FREE_DAILY_CONFESSION_LIMIT } from "@/constants/confessionLimits";

interface ConfessionLimitInfo {
  canPost: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  tier: string;
  isLoading: boolean;
}

export const useConfessionLimits = () => {
  const { user } = useCurrentUser();
  const { subscriptionTier, isLoading: isVipLoading } = useVipStatus(user?.id);
  const [limitInfo, setLimitInfo] = useState<ConfessionLimitInfo>({
    canPost: true,
    currentCount: 0,
    dailyLimit: FREE_DAILY_CONFESSION_LIMIT,
    remaining: FREE_DAILY_CONFESSION_LIMIT,
    tier: 'free',
    isLoading: true,
  });

  const checkLimits = useCallback(async () => {
    if (!user) {
      setLimitInfo({
        canPost: false,
        currentCount: 0,
        dailyLimit: FREE_DAILY_CONFESSION_LIMIT,
        remaining: FREE_DAILY_CONFESSION_LIMIT,
        tier: 'free',
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('can_user_post_confession', {
        _user_id: user.id,
      }) as { data: any; error: any };

      if (error) throw error;

      const result = data as {
        can_post: boolean;
        current_count: number;
        daily_limit: number;
        tier: string;
        remaining: number;
      };

      setLimitInfo({
        canPost: result.can_post,
        currentCount: result.current_count,
        dailyLimit: result.daily_limit === -1 ? Infinity : result.daily_limit,
        remaining: result.remaining === -1 ? Infinity : result.remaining,
        tier: result.tier,
        isLoading: false,
      });
    } catch (error) {
      logError('Error checking confession limits', error as Error);
      setLimitInfo(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  const incrementCount = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('increment_daily_confession_count', {
        _user_id: user.id,
      });
      
      // Refresh limits after incrementing
      await checkLimits();
    } catch (error) {
      logError('Error incrementing confession count', error as Error);
    }
  }, [user, checkLimits]);

  useEffect(() => {
    if (!isVipLoading) {
      checkLimits();
    }
  }, [checkLimits, isVipLoading]);

  return {
    ...limitInfo,
    checkLimits,
    incrementCount,
  };
};
