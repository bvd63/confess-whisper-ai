import { describe, it, expect } from 'vitest';
import { translations, type Language } from '@/i18n/translations';
import { ensureLanguage } from '@/contexts/LanguageContext';

describe('Translation System', () => {
  const languages: Language[] = ['en', 'es', 'de'];
  
  // Helper to get all string entries (not nested objects)
  const getStringEntries = (lang: Language) => {
    return Object.entries(translations[lang]).filter(
      ([_key, value]) => typeof value === 'string'
    ) as [string, string][];
  };
  
  describe('Translation Completeness', () => {
    it('should have all languages defined', () => {
      languages.forEach(lang => {
        expect(translations[lang]).toBeDefined();
        expect(typeof translations[lang]).toBe('object');
      });
    });

    it('should have identical keys across all languages', () => {
      const enKeys = Object.keys(translations.en).sort();
      
      languages.forEach(lang => {
        if (lang === 'en') return;
        
        const langKeys = Object.keys(translations[lang]).sort();
        expect(langKeys).toEqual(enKeys);
      });
    });

    it('should not have empty translation values', () => {
      languages.forEach(lang => {
        const entries = getStringEntries(lang);
        entries.forEach(([_key, value]) => {
          expect(value).toBeTruthy();
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have consistent parameter placeholders', () => {
      const enEntries = getStringEntries('en');
      
      enEntries.forEach(([key, enValue]) => {
        const placeholders = enValue.match(/\{[^}]+\}/g) || [];
        
        languages.forEach(lang => {
          if (lang === 'en') return;
          
          const langValue = (translations[lang] as Record<string, unknown>)[key];
          if (typeof langValue !== 'string') return; // Skip non-string values
          
          const langPlaceholders = langValue.match(/\{[^}]+\}/g) || [];
          
          expect(langPlaceholders.length).toBe(placeholders.length);
          expect(langPlaceholders.sort()).toEqual(placeholders.sort());
        });
      });
    });
  });

  describe('Translation Categories', () => {
    const categories = {
      common: /^common_/,
      auth: /^auth_/,
      confession: /^confession_/,
      profile: /^profile_/,
      system: /^system_/,
      validation: /^validation_/,
      performance: /^performance_/,
    };

    Object.entries(categories).forEach(([category, pattern]) => {
      it(`should have ${category} translations`, () => {
        const keys = Object.keys(translations.en);
        const categoryKeys = keys.filter(key => pattern.test(key));
        
        expect(categoryKeys.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Language Code Validation', () => {
    it('should return valid language for supported codes', () => {
      expect(ensureLanguage('en')).toBe('en');
      expect(ensureLanguage('es')).toBe('es');
      expect(ensureLanguage('de')).toBe('de');
    });

    it('should return English for invalid codes', () => {
      expect(ensureLanguage('fr')).toBe('en');
      expect(ensureLanguage('invalid')).toBe('en');
      expect(ensureLanguage('')).toBe('en');
      expect(ensureLanguage(null)).toBe('en');
      expect(ensureLanguage(undefined)).toBe('en');
    });

    it('should handle case-insensitive input', () => {
      expect(ensureLanguage('EN')).toBe('en');
      expect(ensureLanguage('Es')).toBe('es');
      expect(ensureLanguage('DE')).toBe('de');
    });

    it('should extract language code from locale', () => {
      expect(ensureLanguage('en-US')).toBe('en');
      expect(ensureLanguage('es-MX')).toBe('es');
      expect(ensureLanguage('de-DE')).toBe('de');
    });
  });

  describe('Translation Quality', () => {
    it('should not have translations that are too long', () => {
      const MAX_LENGTH = 500;
      
      languages.forEach(lang => {
        getStringEntries(lang).forEach(([_key, value]) => {
          expect(value.length).toBeLessThanOrEqual(MAX_LENGTH);
        });
      });
    });

    it('should not have HTML tags in translations', () => {
      const htmlPattern = /<[^>]+>/;
      
      languages.forEach(lang => {
        getStringEntries(lang).forEach(([_key, value]) => {
          expect(htmlPattern.test(value)).toBe(false);
        });
      });
    });

    it('should have proper sentence capitalization', () => {
      // Use Unicode-aware capitalization check: first letter character should be uppercase
      languages.forEach(lang => {
        getStringEntries(lang).forEach(([key, value]) => {
          if (key.includes('_title') || key.includes('_heading')) {
            const firstLetterMatch = value.match(/\p{L}/u); // first Unicode letter
            if (firstLetterMatch) {
              const ch = firstLetterMatch[0];
              expect(ch).toBe(ch.toLocaleUpperCase());
            }
          }
        });
      });
    });
  });

  describe('Critical Translations', () => {
    const criticalKeys = [
      'common_error',
      'common_success',
      'common_loading',
      'auth_login',
      'auth_signup',
      'system_network_error',
      'validation_required_field',
      // Communities feature disabled
      // 'communities_title',
      // 'communities_join',
      // 'communities_leave',
      // 'communities_pending',
      // 'communities_request_join',
    ];

    criticalKeys.forEach(key => {
      it(`should have ${key} in all languages`, () => {
        languages.forEach(lang => {
          expect(translations[lang][key]).toBeDefined();
          expect(translations[lang][key].length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Validation Translations', () => {
    it('should have all validation error translations', () => {
      const validationKeys = [
        'validation_required_field',
        'validation_email_invalid',
        'validation_content_min',
        'validation_content_max',
        'validation_invalid_url',
      ];

      validationKeys.forEach(key => {
        languages.forEach(lang => {
          expect(translations[lang][key]).toBeDefined();
        });
      });
    });

    it('should support parameter interpolation in validation messages', () => {
      const minMessage = translations.en.validation_content_min;
      const maxMessage = translations.en.validation_content_max;

      expect(minMessage).toContain('{min}');
      expect(maxMessage).toContain('{max}');
    });
  });

  describe('Performance', () => {
    it('should load translations quickly', () => {
      const start = performance.now();
      const _loaded = { ...translations };
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should load in < 10ms
    });

    it('should have reasonable bundle size', () => {
      const jsonSize = JSON.stringify(translations).length;
      const KB = jsonSize / 1024;

      expect(KB).toBeLessThan(260); // Allow headroom for new auth/reset copy
    });
  });
});
