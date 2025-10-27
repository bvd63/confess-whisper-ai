import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy';

const HAPTIC_DURATIONS = {
  light: 10,
  medium: 20,
  heavy: 30
};

type VibrateFn = (pattern: number | number[]) => boolean;
const getVibrate = (): VibrateFn | undefined => {
  const nv = navigator as Navigator & { vibrate?: VibrateFn };
  return typeof nv?.vibrate === 'function' ? nv.vibrate : undefined;
};

export function useHaptic() {
  const vibrate = useCallback((type: HapticType = 'light') => {
    try {
      const api = getVibrate();
      if (api) {
        api(HAPTIC_DURATIONS[type]);
      }
    } catch {
      // no-op: haptics are best-effort only
    }
  }, []);

  const vibratePattern = useCallback((pattern: number[]) => {
    try {
      const api = getVibrate();
      if (!api) return;

      // Validate pattern is an array of finite, non-negative numbers
      const safePattern = Array.isArray(pattern)
        ? pattern
            .map((n) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0))
            .filter((n) => n >= 0)
        : [];

      if (safePattern.length === 0) return;
      api(safePattern);
    } catch {
      // no-op
    }
  }, []);

  return { vibrate, vibratePattern };
}
