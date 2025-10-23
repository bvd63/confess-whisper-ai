import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Content validation and security filtering
 */
class ContentValidator {
  // Personal information patterns
  private readonly EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  private readonly PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  private readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private readonly CREDIT_CARD_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  private readonly IP_ADDRESS_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

  // SQL injection patterns
  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
  ];

  // XSS patterns
  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  // Profanity lists by language
  private readonly PROFANITY: Record<string, string[]> = {
    en: ['fuck', 'shit', 'bitch', 'asshole', 'damn', 'cunt'],
    es: ['mierda', 'puta', 'cabrón', 'joder', 'coño'],
    de: ['scheiße', 'arsch', 'fick', 'scheiss', 'fotze'],
  };

  // Rate limiting
  private submissionHistory: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_SUBMISSIONS_PER_WINDOW = 10;

  /**
   * Validate content for security issues
   */
  validateContent(content: string, userId?: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check for PII
    if (this.containsPII(content)) {
      issues.push({
        type: 'pii',
        severity: 'high',
        message: 'personal_info_detected',
      });
    }

    // Check for SQL injection
    if (this.containsSQLInjection(content)) {
      issues.push({
        type: 'sql_injection',
        severity: 'critical',
        message: 'suspicious_content_detected',
      });
    }

    // Check for XSS
    if (this.containsXSS(content)) {
      issues.push({
        type: 'xss',
        severity: 'critical',
        message: 'suspicious_content_detected',
      });
    }

    // Check profanity (warning only)
    const profanityCount = this.countProfanity(content);
    if (profanityCount > 3) {
      issues.push({
        type: 'profanity',
        severity: 'medium',
        message: 'excessive_profanity',
      });
    }

    // Check rate limit
    if (userId && !this.checkRateLimit(userId)) {
      issues.push({
        type: 'rate_limit',
        severity: 'high',
        message: 'rate_limit_exceeded',
      });
    }

    return {
      isValid: issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      sanitizedContent: this.sanitize(content),
    };
  }

  /**
   * Sanitize content by removing dangerous patterns
   */
  sanitize(content: string): string {
    let sanitized = content;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Encode HTML special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  }

  /**
   * Check for personal information
   */
  private containsPII(content: string): boolean {
    return (
      this.EMAIL_REGEX.test(content) ||
      this.PHONE_REGEX.test(content) ||
      this.SSN_REGEX.test(content) ||
      this.CREDIT_CARD_REGEX.test(content)
    );
  }

  /**
   * Check for SQL injection attempts
   */
  private containsSQLInjection(content: string): boolean {
    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(content));
  }

  /**
   * Check for XSS attempts
   */
  private containsXSS(content: string): boolean {
    return this.XSS_PATTERNS.some((pattern) => pattern.test(content));
  }

  /**
   * Count profanity words
   */
  private countProfanity(content: string, language: string = 'en'): number {
    const words = content.toLowerCase().split(/\s+/);
    const profanityList = this.PROFANITY[language] || this.PROFANITY.en;
    
    return words.filter((word) =>
      profanityList.some((profanity) => word.includes(profanity))
    ).length;
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const history = this.submissionHistory.get(userId) || [];
    
    // Filter submissions within window
    const recentSubmissions = history.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW
    );

    if (recentSubmissions.length >= this.MAX_SUBMISSIONS_PER_WINDOW) {
      return false;
    }

    // Update history
    recentSubmissions.push(now);
    this.submissionHistory.set(userId, recentSubmissions);

    return true;
  }

  /**
   * Mask PII in content for display
   */
  maskPII(content: string): string {
    let masked = content;

    // Mask emails
    masked = masked.replace(this.EMAIL_REGEX, (match) => {
      const [local, domain] = match.split('@');
      return `${local.charAt(0)}***@${domain}`;
    });

    // Mask phone numbers
    masked = masked.replace(this.PHONE_REGEX, '***-***-****');

    // Mask SSN
    masked = masked.replace(this.SSN_REGEX, '***-**-****');

    // Mask credit cards
    masked = masked.replace(this.CREDIT_CARD_REGEX, '**** **** **** ****');

    return masked;
  }

  /**
   * Clear rate limit history (for testing or admin override)
   */
  clearRateLimit(userId: string): void {
    this.submissionHistory.delete(userId);
  }
}

// Types
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  sanitizedContent: string;
}

export interface ValidationIssue {
  type: 'pii' | 'sql_injection' | 'xss' | 'profanity' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export const contentValidator = new ContentValidator();
