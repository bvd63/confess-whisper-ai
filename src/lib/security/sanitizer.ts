import DOMPurify from 'dompurify';

/**
 * XSS Sanitization Utility
 * Prevents XSS attacks by sanitizing user-generated content
 */

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
  stripScripts?: boolean;
  stripIframes?: boolean;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
  allowedAttributes: {
    'a': ['href', 'title'],
  },
  stripScripts: true,
  stripIframes: true,
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(content: string, options: SanitizeOptions = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Configure DOMPurify
  const config: any = {
    ALLOWED_TAGS: mergedOptions.allowedTags,
    ALLOWED_ATTR: mergedOptions.allowedAttributes,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  };

  if (mergedOptions.stripScripts) {
    config.FORBID_TAGS = ['script', 'style'];
  }

  if (mergedOptions.stripIframes) {
    config.FORBID_TAGS = [...(config.FORBID_TAGS || []), 'iframe', 'object', 'embed'];
  }

  return String(DOMPurify.sanitize(content, config));
}

/**
 * Sanitize plain text (encode HTML entities)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitize confession content (allows limited formatting)
 */
export function sanitizeConfession(content: string): string {
  return String(sanitizeHtml(content, {
    allowedTags: ['p', 'br', 'strong', 'em'],
    allowedAttributes: {},
  }));
}

/**
 * Sanitize comment content (plain text only)
 */
export function sanitizeComment(content: string): string {
  return sanitizeText(content);
}

/**
 * Sanitize user bio (allows links and basic formatting)
 */
export function sanitizeBio(content: string): string {
  return String(sanitizeHtml(content, {
    allowedTags: ['p', 'br', 'strong', 'em', 'a'],
    allowedAttributes: {
      'a': ['href', 'title'],
    },
  }));
}

/**
 * Sanitize user nickname (alphanumeric + underscores only)
 */
export function sanitizeNickname(nickname: string): string {
  return nickname.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 24);
}

/**
 * Remove all HTML tags (aggressive sanitization)
 */
export function stripAllHtml(content: string): string {
  return String(DOMPurify.sanitize(content, { ALLOWED_TAGS: [] }));
}

/**
 * Check if content contains suspicious patterns
 */
export function containsSuspiciousPatterns(content: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(content));
}
