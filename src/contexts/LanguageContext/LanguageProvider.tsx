import { useState, useEffect, type ReactNode } from "react";
import { translations } from "@/i18n/translations";
import { persistenceManager } from "@/lib/persistenceManager";
import { logDebug, logError } from "@/lib/logger";
import { LanguageContext, type Language } from "./context";
import { ensureLanguage, detectBrowserLanguage } from "./helpers";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await persistenceManager.getLanguage();
        if (saved) {
          const validLang = ensureLanguage(saved);
          logDebug("[LanguageContext] Loaded from persistence", { language: validLang });
          setLanguageState(validLang);
        } else {
          const detected = detectBrowserLanguage();
          logDebug("[LanguageContext] Detected browser language", { language: detected });
          setLanguageState(detected);
          await persistenceManager.saveLanguage(detected);
        }
      } catch (error) {
        logError("[LanguageContext] Error loading language", error instanceof Error ? error : undefined);
        const detected = detectBrowserLanguage();
        setLanguageState(detected);
      }
      setIsLoaded(true);
      if (typeof window !== "undefined") {
        (window as unknown as { __i18nReady?: boolean }).__i18nReady = true;
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    const validLang = ensureLanguage(lang);
    logDebug("[LanguageContext] Setting language", { language: validLang });
    setLanguageState(validLang);

    try {
      await persistenceManager.saveLanguage(validLang);
      window.location.reload();
    } catch (error) {
      logError("[LanguageContext] Error saving language", error instanceof Error ? error : undefined);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    logDebug("[LanguageContext] HTML lang attribute set", { language });
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  if (!isLoaded) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
