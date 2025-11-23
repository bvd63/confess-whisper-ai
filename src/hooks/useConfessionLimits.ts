import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { usePremiumStatus } from './usePremiumStatus';
import { logError } from '@/lib/logger';

interface ConfessionLimitInfo {
  canPost: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  tier: string;
  isLoading: boolean;
}

type ConfessionLimitResponse = {
  can_post: boolean;
  current_count: number;
  daily_limit: number;
  tier: string;
  remaining: number;
};

export const useConfessionLimits = () => {
  const { user } = useCurrentUser();
  const { subscriptionTier, isLoading: isPremiumLoading } = usePremiumStatus(user?.id);
  const [limitInfo, setLimitInfo] = useState<ConfessionLimitInfo>({
    canPost: true,
    currentCount: 0,
    dailyLimit: 3,
    remaining: 3,
    tier: 'free',
    isLoading: true,
  });

  const checkLimits = useCallback(async () => {
    if (!user) {
      setLimitInfo({
        canPost: false,
        currentCount: 0,
        dailyLimit: 3,
        remaining: 3,
        tier: 'free',
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc<ConfessionLimitResponse>('can_user_post_confession', {
        _user_id: user.id,
      });

      if (error || !data) {
        throw error ?? new Error('Unable to determine confession limits');
      }

      setLimitInfo({
        canPost: data.can_post,
        currentCount: data.current_count,
        dailyLimit: data.daily_limit === -1 ? Infinity : data.daily_limit,
        remaining: data.remaining === -1 ? Infinity : data.remaining,
        tier: data.tier,
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
    if (!isPremiumLoading) {
      checkLimits();
    }
  }, [checkLimits, isPremiumLoading]);

  return {
    ...limitInfo,
    checkLimits,
    incrementCount,
  };
};
