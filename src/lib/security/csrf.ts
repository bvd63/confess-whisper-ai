/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for state-changing operations
 */

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store CSRF token in session storage
 */
export function storeCsrfToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrf_token', token);
  }
}

/**
 * Get CSRF token from session storage
 */
export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  let token = sessionStorage.getItem('csrf_token');
  
  if (!token) {
    token = generateCsrfToken();
    storeCsrfToken(token);
  }
  
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(providedToken: string): boolean {
  const storedToken = getCsrfToken();
  
  if (!storedToken || !providedToken) {
    return false;
  }
  
  // Timing-safe comparison
  return timingSafeEqual(storedToken, providedToken);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  
  if (!token) {
    return headers;
  }
  
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * React hook for CSRF protection
 */
export function useCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return getCsrfToken();
}

/**
 * Clear CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('csrf_token');
  }
}
