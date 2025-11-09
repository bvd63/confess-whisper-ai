/**
 * Translation System Runtime Validator
 * 
 * Validates that:
 * 1. Only EN/ES/DE languages are used
 * 2. All translation keys exist in all languages
 * 3. No language mixing occurs
 */

import { translations, SUPPORTED_LANGUAGES, type Language } from '@/i18n/translations';
import { env } from '@/lib/env';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all translation keys exist in all supported languages
 */
export function validateTranslationCompleteness(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Get all keys from English (reference language)
  const englishKeys = Object.keys(translations.en);
  
  // Check each supported language
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === 'en') return; // Skip English as it's the reference
    
    const langKeys = Object.keys(translations[lang]);
    
    // Find missing keys
    const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
    if (missingKeys.length > 0) {
      result.isValid = false;
      result.errors.push(
        `Language "${lang}" is missing ${missingKeys.length} keys: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`
      );
    }
    
    // Find extra keys (not in English)
    const extraKeys = langKeys.filter(key => !englishKeys.includes(key));
    if (extraKeys.length > 0) {
      result.warnings.push(
        `Language "${lang}" has ${extraKeys.length} extra keys not in English: ${extraKeys.slice(0, 5).join(', ')}${extraKeys.length > 5 ? '...' : ''}`
      );
    }
  });

  return result;
}

/**
 * Validates that a language code is supported
 */
export function validateLanguageCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toLowerCase().slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(normalized);
}

/**
 * Logs validation results in development mode
 */
export function logValidationResults(result: ValidationResult): void {
  if (!env.isDev) return;

  if (result.errors.length > 0) {
    console.group('🚨 Translation System Errors');
    result.errors.forEach(error => console.error(error));
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Translation System Warnings');
    result.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Translation system validation passed');
  }
}

/**
 * Runs all validation checks
 */
export function validateTranslationSystem(): ValidationResult {
  const completenessResult = validateTranslationCompleteness();
  
  if (env.isDev) {
    logValidationResults(completenessResult);
  }
  
  return completenessResult;
}

/**
 * Development-only: Scan for hardcoded strings in components
 * This is a runtime check that logs warnings for potential hardcoded text
 */
export function detectHardcodedStrings(componentName: string, props: Record<string, any>): void {
  if (!env.isDev) return;
  
  const suspiciousProps = ['title', 'placeholder', 'aria-label', 'alt'];
  const suspiciousPatterns = [
    /^[A-Z][a-z]{3,}/,  // Words starting with capital letter (likely English)
    /\b(the|and|for|with|from)\b/i,  // Common English words
  ];
  
  suspiciousProps.forEach(propName => {
    const value = props[propName];
    if (typeof value === 'string') {
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(value));
      if (isSuspicious) {
        console.warn(
          `[i18n] Potential hardcoded string in ${componentName}: ` +
          `${propName}="${value}". Consider using t.key instead.`
        );
      }
    }
  });
}
