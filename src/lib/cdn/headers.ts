/**
 * CDN Headers Configuration
 * Optimizes caching and compression for CDN delivery
 */

export const cdnHeaders = {
  // Cloudflare specific
  'CF-Cache-Control': 'public, max-age=300',
  'CF-Cache-Tag': 'confessions',
  
  // General CDN
  'Vary': 'Accept-Encoding, Accept-Language',
  'X-Content-Type-Options': 'nosniff',
  
  // Compression hints
  'Accept-Encoding': 'gzip, br',
  
  // Security headers
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Get cache headers for specific resource type
 */
export function getCacheHeaders(resourceType: 'static' | 'api' | 'content' | 'font'): HeadersInit {
  const maxAgeMap = {
    static: 86400,   // 24 hours
    api: 300,        // 5 minutes
    content: 120,    // 2 minutes
    font: 2592000,   // 30 days
  };

  return {
    'Cache-Control': `public, max-age=${maxAgeMap[resourceType]}`,
    'CDN-Cache-Control': `max-age=${maxAgeMap[resourceType]}`,
    ...cdnHeaders,
  };
}

/**
 * Apply compression headers based on content type
 */
export function getCompressionHeaders(contentType: string): HeadersInit {
  const compressible = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'image/svg+xml',
  ];

  const shouldCompress = compressible.some(type => contentType.startsWith(type));

  if (shouldCompress) {
    return {
      'Content-Encoding': 'gzip',
      'Vary': 'Accept-Encoding',
    };
  }

  return {};
}

/**
 * Get security headers
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}
