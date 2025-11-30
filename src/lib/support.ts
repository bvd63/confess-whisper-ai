import type { Language } from '@/contexts/LanguageContext';
import { translations } from '@/i18n/translations';

export const SUPPORT_EMAIL = 'confess.supp@gmail.com';

export function buildSupportMailto(language: Language): string {
  const localeTranslations = translations[language];
  const subject = encodeURIComponent(localeTranslations.support_email_subject);
  const body = encodeURIComponent(localeTranslations.support_email_body);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
