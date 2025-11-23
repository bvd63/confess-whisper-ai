import { createContext } from "react";
import { translations, type Language } from "@/i18n/translations";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations["en"];
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export type { Language };
