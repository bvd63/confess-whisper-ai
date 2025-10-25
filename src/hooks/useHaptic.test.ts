import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHaptic } from './useHaptic';

describe('useHaptic', () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: vi.fn()
    });
  });

  it('should vibrate with light pattern', () => {
    const { result } = renderHook(() => useHaptic());
    
    act(() => {
      result.current.vibrate('light');
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('should vibrate with medium pattern', () => {
    const { result } = renderHook(() => useHaptic());
    
    act(() => {
      result.current.vibrate('medium');
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(20);
  });

  it('should vibrate with heavy pattern', () => {
    const { result } = renderHook(() => useHaptic());
    
    act(() => {
      result.current.vibrate('heavy');
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(30);
  });

  it('should vibrate with custom pattern', () => {
    const { result } = renderHook(() => useHaptic());
    const pattern = [100, 50, 100];
    
    act(() => {
      result.current.vibratePattern(pattern);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(pattern);
  });

  it('should handle missing vibrate API gracefully', () => {
    // Use vi.stubGlobal to temporarily remove vibrate
    const originalVibrate = navigator.vibrate;
    vi.stubGlobal('navigator', { ...navigator, vibrate: undefined });

    const { result } = renderHook(() => useHaptic());
    
    expect(() => {
      act(() => {
        result.current.vibrate('light');
      });
    }).not.toThrow();

    // Restore
    vi.stubGlobal('navigator', { ...navigator, vibrate: originalVibrate });
  });
});
