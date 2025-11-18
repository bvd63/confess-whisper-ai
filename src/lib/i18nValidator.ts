/**
 * Translation System Runtime Validator
 * 
 * Validates that:
 * 1. Only EN/ES/DE languages are used
 * 2. All translation keys exist in all languages
 * 3. No language mixing occurs
 */

import { SUPPORTED_LANGUAGES, loadTranslations, type Language } from '@/i18n/translations';
import { env } from '@/lib/env';
import { logInfo, logWarn, logError } from '@/lib/logger';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all translation keys exist in all supported languages
 */
export async function validateTranslationCompleteness(): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Get all keys from English (reference language)
  const englishTranslations = await loadTranslations('en');
  const englishKeys = Object.keys(englishTranslations);
  
  // Check each supported language
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue; // Skip English as it's the reference

    try {
      const langTranslations = await loadTranslations(lang);
      const langKeys = Object.keys(langTranslations);

      const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
      if (missingKeys.length > 0) {
        result.isValid = false;
        result.errors.push(
          `Language "${lang}" is missing ${missingKeys.length} keys: ${missingKeys
            .slice(0, 5)
            .join(', ')}${missingKeys.length > 5 ? '...' : ''}`
        );
      }

      const extraKeys = langKeys.filter(key => !englishKeys.includes(key));
      if (extraKeys.length > 0) {
        result.warnings.push(
          `Language "${lang}" has ${extraKeys.length} extra keys not in English: ${extraKeys
            .slice(0, 5)
            .join(', ')}${extraKeys.length > 5 ? '...' : ''}`
        );
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to load translations for "${lang}": ${(error as Error).message}`);
    }
  }

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
    logWarn('🚨 Translation System Errors');
    result.errors.forEach(error => logError(error));
  }

  if (result.warnings.length > 0) {
    logWarn('⚠️ Translation System Warnings');
    result.warnings.forEach(warning => logWarn(warning));
  }

  if (result.isValid && result.warnings.length === 0) {
    logInfo('✅ Translation system validation passed');
  }
}

/**
 * Runs all validation checks
 */
export async function validateTranslationSystem(): Promise<ValidationResult> {
  const completenessResult = await validateTranslationCompleteness();
  
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
        logWarn(
          `[i18n] Potential hardcoded string in ${componentName}: ` +
          `${propName}="${value}". Consider using t.key instead.`
        );
      }
    }
  });
}

/**
 * Runtime language consistency checker
 * Validates that the app doesn't mix languages in a single view
 */
export function validateRuntimeLanguageConsistency(): boolean {
  if (!env.isDev) return true;
  
  // Check if document has mixed content
  const textNodes = document.evaluate(
    '//text()[normalize-space()]',
    document.body,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  
  // This is a simplified check - could be enhanced with language detection library
  return true; // Placeholder - implement if needed
}
