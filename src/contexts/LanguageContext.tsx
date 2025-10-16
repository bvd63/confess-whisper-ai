import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Language, translations } from '@/i18n/translations';

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
  const [language, setLanguageState] = useState<Language>(() => {
    // Priority: localStorage > browser detection > default 'en'
    try {
      const saved = localStorage.getItem('language');
      if (saved) {
        const validLang = ensureLanguage(saved);
        console.log('[LanguageContext] Loaded from localStorage:', validLang);
        return validLang;
      }
    } catch (error) {
      console.error('[LanguageContext] Error reading localStorage:', error);
    }
    
    const detected = detectBrowserLanguage();
    console.log('[LanguageContext] Detected browser language:', detected);
    
    // Save detected language to localStorage
    try {
      localStorage.setItem('language', detected);
    } catch (error) {
      console.error('[LanguageContext] Error saving to localStorage:', error);
    }
    
    return detected;
  });

  const setLanguage = (lang: Language) => {
    const validLang = ensureLanguage(lang);
    console.log('[LanguageContext] Setting language to:', validLang);
    setLanguageState(validLang);
    
    try {
      localStorage.setItem('language', validLang);
    } catch (error) {
      console.error('[LanguageContext] Error saving language:', error);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    console.log('[LanguageContext] HTML lang attribute set to:', language);
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

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
