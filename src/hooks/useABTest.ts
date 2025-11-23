import { useState, useEffect } from 'react';
import { logDebug } from '@/lib/logger';

interface ABTestConfig {
  testId: string;
  variants: string[];
  weights?: number[]; // Optional weights for each variant (must sum to 1)
}

interface ABTestResult {
  variant: string;
  trackConversion: () => void;
}

/**
 * A/B Testing hook with persistent variant assignment
 * Stores variant in localStorage to ensure consistent experience
 */
export const useABTest = ({ testId, variants, weights }: ABTestConfig): ABTestResult => {
  const [variant, setVariant] = useState<string>('');

  useEffect(() => {
    // Check if user already has a variant assigned
    const storageKey = `ab_test_${testId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored && variants.includes(stored)) {
      setVariant(stored);
      return;
    }

    // Assign new variant based on weights or uniform distribution
    let selectedVariant: string;
    
    if (weights && weights.length === variants.length) {
      // Weighted selection
      const random = Math.random();
      let sum = 0;
      selectedVariant = variants[0];
      
      for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (random <= sum) {
          selectedVariant = variants[i];
          break;
        }
      }
    } else {
      // Uniform distribution
      const randomIndex = Math.floor(Math.random() * variants.length);
      selectedVariant = variants[randomIndex];
    }

    // Store variant
    localStorage.setItem(storageKey, selectedVariant);
    setVariant(selectedVariant);

    // Track variant assignment
    trackEvent('ab_test_assigned', {
      testId,
      variant: selectedVariant,
    });
  }, [testId, variants, weights]);

  const trackConversion = () => {
    trackEvent('ab_test_conversion', {
      testId,
      variant,
    });
  };

  return { variant, trackConversion };
};

// Helper to track events (integrate with your analytics)
type TrackEventPayload = Record<string, string | number | boolean | null | undefined>;
type GtagFunction = (...args: unknown[]) => void;

const trackEvent = (event: string, data: TrackEventPayload) => {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as Window & { gtag?: GtagFunction }).gtag;
    gtag?.('event', event, data);
  }
  logDebug('AB Test Event', { event, ...data });
};
