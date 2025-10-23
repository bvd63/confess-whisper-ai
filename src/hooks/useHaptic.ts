import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy';

const HAPTIC_DURATIONS = {
  light: 10,
  medium: 20,
  heavy: 30
};

export function useHaptic() {
  const vibrate = useCallback((type: HapticType = 'light') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(HAPTIC_DURATIONS[type]);
    }
  }, []);

  const vibratePattern = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return { vibrate, vibratePattern };
}
