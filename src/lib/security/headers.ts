/**
 * Security Headers Configuration
 * Implements best practices for web application security
 */

export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableFrameGuard?: boolean;
  enableXSSProtection?: boolean;
  enableContentTypeNoSniff?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
}

const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableFrameGuard: true,
  enableXSSProtection: true,
  enableContentTypeNoSniff: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
};

/**
 * Get security headers for the application
 */
export function getSecurityHeaders(config: SecurityHeadersConfig = {}): Record<string, string> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const headers: Record<string, string> = {};

  // Content Security Policy
  if (mergedConfig.enableCSP) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://challenges.cloudflare.com wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');
  }

  // HTTP Strict Transport Security (1 year)
  if (mergedConfig.enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Prevent clickjacking
  if (mergedConfig.enableFrameGuard) {
    headers['X-Frame-Options'] = 'SAMEORIGIN';
  }

  // XSS Protection
  if (mergedConfig.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  // Prevent MIME type sniffing
  if (mergedConfig.enableContentTypeNoSniff) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer Policy
  if (mergedConfig.enableReferrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }

  // Permissions Policy (Feature Policy)
  if (mergedConfig.enablePermissionsPolicy) {
    headers['Permissions-Policy'] = [
      'geolocation=(self)',
      'microphone=()',
      'camera=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ');
  }

  return headers;
}

/**
 * Get CORS headers for API responses
 */
export function getCorsHeaders(allowedOrigins: string[] = ['*']): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Apply security headers to a Response object
 */
export function applySecurityHeaders(
  response: Response,
  config?: SecurityHeadersConfig
): Response {
  const headers = new Headers(response.headers);
  const securityHeaders = getSecurityHeaders(config);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Security headers for Edge Functions
 */
export const edgeFunctionSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
