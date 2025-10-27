import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfessionRateLimit } from '@/hooks/useConfessionRateLimit';
import { getSupabase } from '@/lib/supabaseClient';

describe('Rate Limit Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no rate limit', () => {
    const { result } = renderHook(() => useConfessionRateLimit());

    expect(result.current.isLimited).toBe(false);
    expect(result.current.remainingRequests).toBe(100);
    expect(result.current.totalRequests).toBe(100);
  });

  it('handles successful rate limit check', async () => {
  vi.mocked(getSupabase().functions.invoke).mockResolvedValue({
      data: {
        allowed: true,
        remaining: 95,
        resetAt: Date.now() + 900000,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    let allowed = false;
    await act(async () => {
      allowed = await result.current.checkRateLimit();
    });

    expect(allowed).toBe(true);
    expect(getSupabase().functions.invoke).toHaveBeenCalledWith(
      'rate-limit',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'confession_create' }),
      })
    );
  });

  it('handles rate limit exceeded', async () => {
  vi.mocked(getSupabase().functions.invoke).mockResolvedValue({
      data: {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 600000,
        retryAfter: 600,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    let allowed = true;
    await act(async () => {
      allowed = await result.current.checkRateLimit();
    });

    expect(allowed).toBe(false);
    expect(result.current.isLimited).toBe(true);
    expect(result.current.remainingRequests).toBe(0);
  });

  it('formats remaining time correctly', async () => {
  vi.mocked(getSupabase().functions.invoke).mockResolvedValue({
      data: {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 330000, // 5 minutes 30 seconds
        retryAfter: 330,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    await act(async () => {
      await result.current.checkRateLimit();
    });

  const remainingTime = result.current.getRemainingTime();
  expect(remainingTime).toMatch(/\d+ minutes|\d+h \d+m/);
  });

  it('calculates percentage correctly', async () => {
  vi.mocked(getSupabase().functions.invoke).mockResolvedValue({
      data: {
        allowed: true,
        remaining: 75,
        resetAt: Date.now() + 900000,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    await act(async () => {
      await result.current.checkRateLimit();
    });

    expect(result.current.percentage).toBe(75);
  });

  it('resets state when rate limit expires', async () => {
    vi.useFakeTimers();

    const futureTime = Date.now() + 1000;
  vi.mocked(getSupabase().functions.invoke).mockResolvedValue({
      data: {
        allowed: false,
        remaining: 0,
        resetAt: futureTime,
        retryAfter: 1,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    await act(async () => {
      await result.current.checkRateLimit();
    });

    expect(result.current.isLimited).toBe(true);

    // Fast forward time past the reset and the 10s check interval
    await act(async () => {
      vi.advanceTimersByTime(12000);
    });

    // Simulate a subsequent rate limit check after expiry to refresh state
    vi.mocked(getSupabase().functions.invoke).mockResolvedValueOnce({
      data: { allowed: true, remaining: 100, resetAt: Date.now() + 900000 },
      error: null,
    });

    await act(async () => {
      await result.current.checkRateLimit();
    });

    expect(result.current.isLimited).toBe(false);

    vi.useRealTimers();
  });
});
