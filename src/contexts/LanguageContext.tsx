import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Language, translations } from '@/i18n/translations';
import { persistenceManager } from '@/lib/persistenceManager';
import { logDebug, logError } from '@/lib/logger';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
}

export type { Language };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Supported languages whitelist
const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'de'];

/**
 * Ensures the language code is supported, coercing to 'en' if not
 */
export function ensureLanguage(code: string | null | undefined): Language {
  if (!code) return 'en';
  const normalized = code.toLowerCase().slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
}

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
  const [isLoaded, setIsLoaded] = useState(false);

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
      setIsLoaded(true);
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
      // Force full reload to ensure complete language switch with no mixed strings
      window.location.reload();
    } catch (error) {
      logError('[LanguageContext] Error saving language', error instanceof Error ? error : undefined);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    logDebug('[LanguageContext] HTML lang attribute set', { language });
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  // Don't render children until language is loaded
  if (!isLoaded) {
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
