import type { Translations } from './types';
import { env } from '@/lib/env';
import enTranslations from './lang/en';

export type Language = 'en' | 'es' | 'de';
export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'de'];

type TranslationCache = Partial<Record<Language, Translations>>;

type TranslationLoaders = Record<Language, () => Promise<Translations>>;

const translationCache: TranslationCache = {
  en: enTranslations,
};

const translationLoaders: TranslationLoaders = {
  en: async () => enTranslations,
  es: async () => (await import('./lang/es')).default,
  de: async () => (await import('./lang/de')).default,
};

const loadPromises: Partial<Record<Language, Promise<Translations>>> = {};

const translationsProxy = new Proxy({} as Record<Language, Translations>, {
  get: (_target, prop: string) => {
    const lang = ensureLanguage(prop);
    return getCachedTranslations(lang);
  },
});

export function ensureLanguage(code: string | null | undefined): Language {
  if (!code) return 'en';
  const normalized = code.toLowerCase().slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
}

export async function loadTranslations(language: Language): Promise<Translations> {
  const lang = ensureLanguage(language);
  if (translationCache[lang]) {
    return translationCache[lang]!;
  }

  if (!loadPromises[lang]) {
    loadPromises[lang] = translationLoaders[lang]()
      .then((loaded) => {
        translationCache[lang] = loaded;
        return loaded;
      })
      .catch((error) => {
        // Clear the stored promise so subsequent attempts can retry
        loadPromises[lang] = undefined;
        throw error;
      });
  }

  return loadPromises[lang]!;
}

export function getCachedTranslations(language: Language): Translations {
  return translationCache[language] || translationCache.en!;
}

export function getTranslation(key: keyof Translations, language: Language): string {
  const lang = ensureLanguage(language);
  const translations = getCachedTranslations(lang);
  const value = translations[key];

  if (typeof value === 'string') {
    return value;
  }

  const fallback = translationCache.en?.[key];

  if (env.isDev && lang !== 'en') {
    console.warn(
      `[i18n] Missing translation for key "${String(key)}" in language "${lang}". Falling back to English.`
    );
  }

  return typeof fallback === 'string' ? fallback : String(key);
}

export function getTranslationSnapshot(): TranslationCache {
  return { ...translationCache };
}

export const translations: Record<Language, Translations> = translationsProxy;
