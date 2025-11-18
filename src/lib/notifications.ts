/**
 * Global notification system with i18n support
 * Uses the existing toast system with translation keys
 */

import { toast as toastFn } from '@/hooks/use-toast';
import { ensureLanguage, getCachedTranslations, loadTranslations, type Language } from '@/i18n/translations';
import type { Translations } from '@/i18n/types';

// Helper to get nested translation
function getNestedTranslation(key: string, language: Language): string {
  const lang = ensureLanguage(language);
  const keys = key.split('.');
  void loadTranslations(lang).catch(() => undefined);

  const resolveValue = (source: Translations | any): string | null => {
    let value: any = source;
    for (const part of keys) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    return typeof value === 'string' ? value : null;
  };

  const primary = resolveValue(getCachedTranslations(lang));
  if (primary) {
    return primary;
  }

  const fallback = resolveValue(getCachedTranslations('en'));
  return fallback ?? key;
}

export const notify = {
  success: (messageKey: string, language: Language = 'en') => {
    const message = getNestedTranslation(messageKey, language);
    toastFn({
      title: message,
      variant: 'default',
    });
  },

  error: (messageKey: string, language: Language = 'en') => {
    const message = getNestedTranslation(messageKey, language);
    toastFn({
      title: message,
      variant: 'destructive',
    });
  },

  info: (messageKey: string, language: Language = 'en') => {
    const message = getNestedTranslation(messageKey, language);
    toastFn({
      title: message,
      variant: 'default',
    });
  },

  custom: (message: string, variant: 'default' | 'destructive' = 'default') => {
    toastFn({
      title: message,
      variant,
    });
  },
};
