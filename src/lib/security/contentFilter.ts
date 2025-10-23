/**
 * Content Moderation Filter
 * Detects personal information and banned content
 */

interface ContentWarning {
  type: 'email' | 'phone' | 'address' | 'banned_word';
  matches: string[];
}

interface ContentFilterResult {
  safe: boolean;
  warnings: ContentWarning[];
}

// Regex patterns for personal information
const PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  address: /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|circle|cir)\b/gi,
};

// Banned words list (expandable)
const BANNED_WORDS = [
  // Spam indicators
  'click here',
  'buy now',
  'limited offer',
  'act fast',
  // Add more as needed
];

export function filterContent(content: string): ContentFilterResult {
  const warnings: ContentWarning[] = [];
  let safe = true;

  // Check for emails
  const emailMatches = content.match(PATTERNS.email);
  if (emailMatches && emailMatches.length > 0) {
    warnings.push({
      type: 'email',
      matches: emailMatches,
    });
    safe = false;
  }

  // Check for phone numbers
  const phoneMatches = content.match(PATTERNS.phone);
  if (phoneMatches && phoneMatches.length > 0) {
    warnings.push({
      type: 'phone',
      matches: phoneMatches,
    });
    safe = false;
  }

  // Check for addresses
  const addressMatches = content.match(PATTERNS.address);
  if (addressMatches && addressMatches.length > 0) {
    warnings.push({
      type: 'address',
      matches: addressMatches,
    });
    safe = false;
  }

  // Check for banned words
  const bannedMatches = BANNED_WORDS.filter(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );
  if (bannedMatches.length > 0) {
    warnings.push({
      type: 'banned_word',
      matches: bannedMatches,
    });
    safe = false;
  }

  return { safe, warnings };
}

export function getWarningMessage(warning: ContentWarning, language: 'en' | 'es' | 'de' = 'en'): string {
  const messages = {
    en: {
      email: 'Email address detected',
      phone: 'Phone number detected',
      address: 'Physical address detected',
      banned_word: 'Restricted content detected',
    },
    es: {
      email: 'Dirección de email detectada',
      phone: 'Número de teléfono detectado',
      address: 'Dirección física detectada',
      banned_word: 'Contenido restringido detectado',
    },
    de: {
      email: 'E-Mail-Adresse erkannt',
      phone: 'Telefonnummer erkannt',
      address: 'Physische Adresse erkannt',
      banned_word: 'Eingeschränkter Inhalt erkannt',
    },
  };

  return messages[language][warning.type];
}
