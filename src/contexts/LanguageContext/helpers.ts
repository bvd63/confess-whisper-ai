import type { Language } from "./context";

const SUPPORTED_LANGUAGES: Language[] = ["en", "es", "de"];

export function ensureLanguage(code: string | null | undefined): Language {
  if (!code) return "en";
  const normalized = code.toLowerCase().slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "en";
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
  return ensureLanguage(browserLang);
}
