import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfessionRateLimit } from '@/hooks/useConfessionRateLimit';
import { supabaseMock } from '../setup/supabase-mock';

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
    vi.mocked(supabaseMock.functions.invoke).mockResolvedValue({
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
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('rate-limit', {
      body: expect.objectContaining({ action: 'confession_create' }),
    });
  });

  it('handles rate limit exceeded', async () => {
    vi.mocked(supabaseMock.functions.invoke).mockResolvedValue({
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
    vi.mocked(supabaseMock.functions.invoke).mockResolvedValue({
      data: {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 330000, // 5 minutes 30 seconds = 6 minutes ceil
        retryAfter: 330,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    await act(async () => {
      await result.current.checkRateLimit();
    });

    const remainingTime = result.current.getRemainingTime();
    expect(remainingTime).toMatch(/\d+ minutes?/);
  });

  it('calculates percentage correctly', async () => {
    vi.mocked(supabaseMock.functions.invoke).mockResolvedValue({
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

  it('sets state correctly when rate limit expires', async () => {
    // Set a reset time in the past
    const pastTime = Date.now() - 1000;
    vi.mocked(supabaseMock.functions.invoke).mockResolvedValue({
      data: {
        allowed: false,
        remaining: 0,
        resetAt: pastTime,
        retryAfter: 0,
      },
      error: null,
    });

    const { result } = renderHook(() => useConfessionRateLimit());

    await act(async () => {
      await result.current.checkRateLimit();
    });

    // State should show limited even though time is past
    // The interval cleanup happens in useEffect
    expect(result.current.isLimited).toBe(true);
  });
});
