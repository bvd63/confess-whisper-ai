import { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import { logError } from '@/lib/logger';

interface RateLimitState {
  isLimited: boolean;
  remainingRequests: number;
  totalRequests: number;
  resetAt: Date | null;
  retryAfter: number; // seconds
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Hook to handle rate limiting for confession posting
 * Tracks and enforces 100 requests per 15 minutes
 */
export const useConfessionRateLimit = () => {
  const supabase = getSupabase();
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isLimited: false,
    remainingRequests: RATE_LIMIT_CONFIG.maxAttempts,
    totalRequests: RATE_LIMIT_CONFIG.maxAttempts,
    resetAt: null,
    retryAfter: 0,
  });

  // Check rate limit status with backend
  const checkRateLimit = useCallback(async (action: string = 'confession_create'): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('rate-limit', {
        body: {
          action,
          userId: user?.id,
        },
      });

      if (error) {
        logError('Rate limit check error', error);
        return true; // Allow on error
      }

      if (data?.allowed === false) {
        const resetAt = data.resetAt ? new Date(data.resetAt) : null;
        const retryAfter = data.retryAfter || 60;
        
        setRateLimitState({
          isLimited: true,
          remainingRequests: 0,
          totalRequests: RATE_LIMIT_CONFIG.maxAttempts,
          resetAt,
          retryAfter,
        });

        return false;
      }

      // Update state with remaining requests
      const remaining = data?.remaining ?? RATE_LIMIT_CONFIG.maxAttempts;
      const resetAt = data?.resetAt ? new Date(data.resetAt) : null;

      setRateLimitState({
        isLimited: false,
        remainingRequests: remaining,
        totalRequests: RATE_LIMIT_CONFIG.maxAttempts,
        resetAt,
        retryAfter: 0,
      });

      return true;
    } catch (error) {
      logError('Rate limit check failed', error as Error);
      return true; // Allow on error
    }
  }, [supabase]);

  // Calculate remaining time until reset
  const getRemainingTime = useCallback((): string => {
    if (!rateLimitState.resetAt) return '';
    
    const now = new Date();
    const diff = rateLimitState.resetAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '0 minutes';
    }

    const minutes = Math.ceil(diff / 60000);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }, [rateLimitState.resetAt]);

  // Auto-refresh rate limit state every minute
  useEffect(() => {
    if (rateLimitState.isLimited && rateLimitState.resetAt) {
      const interval = setInterval(() => {
        const now = new Date();
        if (now >= rateLimitState.resetAt!) {
          // Reset the limit
          setRateLimitState({
            isLimited: false,
            remainingRequests: RATE_LIMIT_CONFIG.maxAttempts,
            totalRequests: RATE_LIMIT_CONFIG.maxAttempts,
            resetAt: null,
            retryAfter: 0,
          });
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [rateLimitState.isLimited, rateLimitState.resetAt]);

  return {
    ...rateLimitState,
    checkRateLimit,
    getRemainingTime,
    percentage: (rateLimitState.remainingRequests / rateLimitState.totalRequests) * 100,
  };
};
