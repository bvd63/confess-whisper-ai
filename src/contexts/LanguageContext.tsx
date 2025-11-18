import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ensureLanguage,
  getCachedTranslations,
  loadTranslations,
  type Language,
} from '@/i18n/translations';
import type { Translations } from '@/i18n/types';
import { persistenceManager } from '@/lib/persistenceManager';
import { logDebug, logError } from '@/lib/logger';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export type { Language };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Detects browser language with fallback to English
 */
function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language || (navigator as any).userLanguage;
  return ensureLanguage(browserLang);
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);
  const [isTranslationsReady, setIsTranslationsReady] = useState(false);
  const [currentTranslations, setCurrentTranslations] = useState<Translations>(getCachedTranslations('en'));

  // Load language from persistent storage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await persistenceManager.getLanguage();
        if (saved) {
          const validLang = ensureLanguage(saved);
          logDebug('[LanguageContext] Loaded from persistence', { language: validLang });
          setLanguageState(validLang);
        } else {
          const detected = detectBrowserLanguage();
          logDebug('[LanguageContext] Detected browser language', { language: detected });
          setLanguageState(detected);
          await persistenceManager.saveLanguage(detected);
        }
      } catch (error) {
        logError('[LanguageContext] Error loading language', error instanceof Error ? error : undefined);
        const detected = detectBrowserLanguage();
        setLanguageState(detected);
      }
      setIsLanguageLoaded(true);
      // Set i18n ready flag for E2E tests
      if (typeof window !== 'undefined') {
        (window as any).__i18nReady = true;
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    const validLang = ensureLanguage(lang);
    logDebug('[LanguageContext] Setting language', { language: validLang });
    setLanguageState(validLang);
    
    try {
      await persistenceManager.saveLanguage(validLang);
    } catch (error) {
      logError('[LanguageContext] Error saving language', error instanceof Error ? error : undefined);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    logDebug('[LanguageContext] HTML lang attribute set', { language });
  }, [language]);

  useEffect(() => {
    let isActive = true;
    setIsTranslationsReady(false);

    loadTranslations(language)
      .then((loaded) => {
        if (!isActive) return;
        setCurrentTranslations(loaded);
        setIsTranslationsReady(true);
      })
      .catch((error) => {
        if (!isActive) return;
        logError('[LanguageContext] Failed to load translations', error instanceof Error ? error : undefined);
        setCurrentTranslations(getCachedTranslations('en'));
        setIsTranslationsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: currentTranslations,
  };

  // Don't render children until language is loaded
  if (!isLanguageLoaded || !isTranslationsReady) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
