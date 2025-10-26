/**
 * Security Module - Central Export
 * All security utilities for XSS, CSRF, and header protection
 */

export {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeConfession,
  sanitizeComment,
  sanitizeBio,
  sanitizeNickname,
  stripAllHtml,
  containsSuspiciousPatterns,
  type SanitizeOptions,
} from './sanitizer';

export {
  generateCsrfToken,
  storeCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  addCsrfHeader,
  useCsrfToken,
  clearCsrfToken,
} from './csrf';

export {
  getSecurityHeaders,
  getCorsHeaders,
  applySecurityHeaders,
  edgeFunctionSecurityHeaders,
  type SecurityHeadersConfig,
} from './headers';
