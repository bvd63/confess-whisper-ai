import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  attempts: number;
  resetAt: number;
  blockedUntil: number | null;
}

/**
 * Client-side rate limiting hook
 * Tracks attempts per action and enforces limits
 */
export const useRateLimit = (config: RateLimitConfig) => {
  const { maxAttempts, windowMs, blockDurationMs = 60000 } = config;
  const stateRef = useRef<Map<string, RateLimitState>>(new Map());
  const [isBlocked, setIsBlocked] = useState(false);

  const checkLimit = useCallback((key: string): boolean => {
    const now = Date.now();
    const state = stateRef.current.get(key);

    // Check if blocked
    if (state?.blockedUntil && now < state.blockedUntil) {
      setIsBlocked(true);
      return false;
    }

    // Reset if window expired
    if (!state || now > state.resetAt) {
      stateRef.current.set(key, {
        attempts: 1,
        resetAt: now + windowMs,
        blockedUntil: null,
      });
      setIsBlocked(false);
      return true;
    }

    // Increment attempts
    const newAttempts = state.attempts + 1;
    
    if (newAttempts > maxAttempts) {
      // Block user
      stateRef.current.set(key, {
        ...state,
        attempts: newAttempts,
        blockedUntil: now + blockDurationMs,
      });
      setIsBlocked(true);
      return false;
    }

    stateRef.current.set(key, {
      ...state,
      attempts: newAttempts,
    });
    
    setIsBlocked(false);
    return true;
  }, [maxAttempts, windowMs, blockDurationMs]);

  const getRemainingTime = useCallback((key: string): number => {
    const state = stateRef.current.get(key);
    if (!state?.blockedUntil) return 0;
    
    const remaining = Math.max(0, state.blockedUntil - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }, []);

  const reset = useCallback((key: string) => {
    stateRef.current.delete(key);
    setIsBlocked(false);
  }, []);

  return {
    checkLimit,
    getRemainingTime,
    reset,
    isBlocked,
  };
};
