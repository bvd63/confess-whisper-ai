/**
 * Utility functions for safely accessing translations
 */

import { translations, type Language } from '@/i18n/translations';

/**
 * Safely get a string translation, excluding nested objects
 * Returns the key itself if not found or if value is not a string
 */
export function getStringTranslation(
  translationObject: typeof translations['en'],
  key: string
): string {
  const value = translationObject[key as keyof typeof translationObject];
  
  // Only return if it's actually a string, not an object
  if (typeof value === 'string') {
    return value;
  }
  
  // Fallback to key if not a string
  return key;
}

/**
 * Check if a translation key exists and is a string
 */
export function isStringTranslation(
  translationObject: typeof translations['en'],
  key: string
): boolean {
  const value = translationObject[key as keyof typeof translationObject];
  return typeof value === 'string';
}
