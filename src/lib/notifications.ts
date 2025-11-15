/**
 * Global notification system with i18n support
 * Uses the existing toast system with translation keys
 */

import { toast as toastFn } from '@/hooks/use-toast';
import { translations, type Language } from '@/i18n/translations';
import { logWarn } from '@/lib/logger';

// Helper to get nested translation
function getNestedTranslation(key: string, language: Language): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          logWarn('[Notifications] Translation key not found', { key, language });
          return key; // Return key if not found even in English
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
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
