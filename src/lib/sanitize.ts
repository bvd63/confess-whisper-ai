/**
 * Input Sanitization & Security Utilities
 * Provides safe input handling and validation across the app
 */

import { VALIDATION } from '@/lib/constants';

/**
 * Sanitize user text input to prevent XSS
 * Removes dangerous HTML tags and scripts while preserving formatting
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .trim()
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove on* attributes
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove dangerous HTML tags but keep safe formatting
    .replace(/<(iframe|object|embed|script|style|link|meta|form|input|button)[^>]*>/gi, '')
    // Decode HTML entities to prevent double-encoding
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Validate and sanitize confession content
 */
export function validateConfessionContent(content: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length < VALIDATION.CONFESSION.MIN_LENGTH) {
    return {
      valid: false,
      error: `Confession must be at least ${VALIDATION.CONFESSION.MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > VALIDATION.CONFESSION.MAX_LENGTH) {
    return {
      valid: false,
      error: `Confession cannot exceed ${VALIDATION.CONFESSION.MAX_LENGTH} characters`,
    };
  }

  return {
    valid: true,
    sanitized: sanitizeText(trimmed),
  };
}

/**
 * Validate and sanitize comment content
 */
export function validateCommentContent(content: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Comment cannot be empty' };
  }

  const trimmed = content.trim();

  if (trimmed.length < VALIDATION.COMMENT.MIN_LENGTH) {
    return { valid: false, error: 'Comment is too short' };
  }

  if (trimmed.length > VALIDATION.COMMENT.MAX_LENGTH) {
    return {
      valid: false,
      error: `Comment cannot exceed ${VALIDATION.COMMENT.MAX_LENGTH} characters`,
    };
  }

  return {
    valid: true,
    sanitized: sanitizeText(trimmed),
  };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= VALIDATION.EMAIL.MAX_LENGTH;
}

/**
 * Validate username
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < VALIDATION.USERNAME.MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters` };
  }

  if (trimmed.length > VALIDATION.USERNAME.MAX_LENGTH) {
    return { valid: false, error: `Username cannot exceed ${VALIDATION.USERNAME.MAX_LENGTH} characters` };
  }

  // Allow alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Block dangerous protocols
  if (trimmed.match(/^(javascript|data|vbscript|file|about):/i)) {
    return null;
  }

  // Ensure it's a valid HTTP(S) URL
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Escape HTML special characters for safe display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => map[char] || char);
}

/**
 * Remove all HTML tags for plain text display
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Validate that a value is from an allowed list (enum)
 */
export function validateEnum<T extends readonly (string | number)[]>(
  value: unknown,
  allowedValues: T,
): value is T[number] {
  return allowedValues.includes(value as T[number]);
}

/**
 * Safely parse JSON with error handling
 */
export function parseJSON<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Rate limit check for text-based input (e.g., confessions, comments)
 */
export function checkTextRateLimit(
  text: string,
  maxLength: number,
  minInterval: number = 1000, // ms
  lastSubmitTime: number = 0,
): { allowed: boolean; message?: string } {
  // Check length
  if (text.length > maxLength) {
    return { allowed: false, message: `Text exceeds maximum length of ${maxLength}` };
  }

  // Check timing
  const now = Date.now();
  if (now - lastSubmitTime < minInterval) {
    return {
      allowed: false,
      message: `Please wait before submitting again (${Math.ceil((minInterval - (now - lastSubmitTime)) / 1000)}s)`,
    };
  }

  return { allowed: true };
}
