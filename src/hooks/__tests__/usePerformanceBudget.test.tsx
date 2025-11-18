import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePerformanceBudget } from '../usePerformanceBudget';

const observabilityMock = vi.hoisted(() => ({
  getMetricsSummary: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  observability: {
    getMetricsSummary: observabilityMock.getMetricsSummary,
  },
}));

const loggerMock = vi.hoisted(() => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: loggerMock.logError,
  logWarn: loggerMock.logWarn,
}));

vi.mock('@/lib/env', () => ({
  env: { isDev: true },
}));

describe('usePerformanceBudget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observabilityMock.getMetricsSummary.mockReset();
    loggerMock.logError.mockReset();
    loggerMock.logWarn.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('logs an error when metrics exceed the p95 threshold', () => {
    observabilityMock.getMetricsSummary.mockReturnValue({
      api_latency: {
        count: 1,
        avg: 210,
        min: 210,
        max: 210,
        p95: 210,
        p99: 210,
      },
    });

    const { unmount } = renderHook(() =>
      usePerformanceBudget({ p95Threshold: 200, warningThreshold: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(loggerMock.logError).toHaveBeenCalledWith(
      expect.stringContaining('PERFORMANCE BUDGET EXCEEDED')
    );

    unmount();
  });

  it('logs a warning when metrics approach the threshold', () => {
    observabilityMock.getMetricsSummary.mockReturnValue({
      api_latency: {
        count: 1,
        avg: 160,
        min: 160,
        max: 160,
        p95: 160,
        p99: 160,
      },
    });

    const { unmount } = renderHook(() =>
      usePerformanceBudget({ p95Threshold: 200, warningThreshold: 150 })
    );

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(loggerMock.logWarn).toHaveBeenCalledWith(
      expect.stringContaining('PERFORMANCE WARNING')
    );

    unmount();
  });
});
