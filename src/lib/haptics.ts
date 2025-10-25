/**
 * Haptic feedback utilities for mobile devices
 * Provides tactile feedback for user interactions
 */

type HapticType = 'light' | 'medium' | 'heavy';
type HapticPattern = 'success' | 'error' | 'warning';

const HAPTIC_DURATIONS = {
  light: 10,
  medium: 20,
  heavy: 30,
};

const HAPTIC_PATTERNS = {
  success: [10, 50, 10],
  error: [30, 100, 30, 100, 30],
  warning: [20, 80, 20],
};

/**
 * Trigger a single haptic vibration
 */
export const haptic = (type: HapticType = 'light'): void => {
  if (!('vibrate' in navigator)) return;
  
  try {
    navigator.vibrate(HAPTIC_DURATIONS[type]);
  } catch (error) {
    console.debug('Haptic feedback failed:', error);
  }
};

/**
 * Trigger a haptic pattern
 */
export const hapticPattern = (pattern: HapticPattern): void => {
  if (!('vibrate' in navigator)) return;
  
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch (error) {
    console.debug('Haptic pattern failed:', error);
  }
};

/**
 * Trigger a custom haptic pattern
 */
export const hapticCustom = (pattern: number[]): void => {
  if (!('vibrate' in navigator)) return;
  
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.debug('Custom haptic pattern failed:', error);
  }
};

/**
 * Cancel all haptic feedback
 */
export const hapticCancel = (): void => {
  if (!('vibrate' in navigator)) return;
  
  try {
    navigator.vibrate(0);
  } catch (error) {
    console.debug('Cancel haptic failed:', error);
  }
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

// Convenience functions for common interactions
export const hapticClick = () => haptic('light');
export const hapticSuccess = () => hapticPattern('success');
export const hapticError = () => hapticPattern('error');
export const hapticWarning = () => hapticPattern('warning');
