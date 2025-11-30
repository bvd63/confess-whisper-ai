import type { Language } from '@/contexts/LanguageContext';
import { translations } from '@/i18n/translations';

export const SUPPORT_EMAIL = 'confess.supp@gmail.com';

export function buildSupportMailto(language: Language): string {
  const localeTranslations = translations[language];
  const subject = encodeURIComponent(localeTranslations.support_email_subject);
  const body = encodeURIComponent(localeTranslations.support_email_body);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

interface ContactSupportMailtoOptions {
  language: Language;
  name: string;
  email: string;
  issue: string;
}

export function buildContactSupportMailto({ language, name, email, issue }: ContactSupportMailtoOptions): string {
  const localeTranslations = translations[language];
  const subject = encodeURIComponent(localeTranslations.support_email_subject);
  const safeName = name.trim() || '-';
  const safeEmail = email.trim() || '-';
  const safeIssue = issue.trim() || '-';
  const lines = [
    `${localeTranslations.contact_support_name_label}: ${safeName}`,
    `${localeTranslations.contact_support_email_label}: ${safeEmail}`,
    '',
    `${localeTranslations.contact_support_issue_label}:`,
    safeIssue,
    '',
    localeTranslations.contact_support_email_footer,
  ];
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
