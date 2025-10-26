import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeConfession,
  sanitizeComment,
  sanitizeBio,
  sanitizeNickname,
  stripAllHtml,
  containsSuspiciousPatterns,
} from '@/lib/security/sanitizer';

describe('XSS Protection', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove iframes', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('iframe');
    });

    it('should allow safe tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });
  });

  describe('sanitizeText', () => {
    it('should encode HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeText(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should encode quotes', () => {
      const input = 'Hello "world" and \'universe\'';
      const result = sanitizeText(input);
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: URIs', () => {
      const input = 'javascript:alert("XSS")';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should block data: URIs', () => {
      const input = 'data:text/html,<script>alert("XSS")</script>';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should allow safe URLs', () => {
      const input = 'https://example.com/page';
      const result = sanitizeUrl(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeConfession', () => {
    it('should allow basic formatting', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeConfession(input);
      expect(result).toContain('<strong>');
    });

    it('should remove links', () => {
      const input = '<p>Check <a href="https://evil.com">this</a></p>';
      const result = sanitizeConfession(input);
      expect(result).not.toContain('<a');
    });
  });

  describe('sanitizeComment', () => {
    it('should convert to plain text', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeComment(input);
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
    });
  });

  describe('sanitizeBio', () => {
    it('should allow links', () => {
      const input = '<p>Check <a href="https://example.com">my site</a></p>';
      const result = sanitizeBio(input);
      expect(result).toContain('<a');
      expect(result).toContain('href');
    });

    it('should remove scripts', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizeBio(input);
      expect(result).not.toContain('<script');
    });
  });

  describe('sanitizeNickname', () => {
    it('should remove special characters', () => {
      const input = 'user<>123!@#';
      const result = sanitizeNickname(input);
      expect(result).toBe('user123');
    });

    it('should allow underscores', () => {
      const input = 'user_123';
      const result = sanitizeNickname(input);
      expect(result).toBe('user_123');
    });

    it('should truncate to 24 characters', () => {
      const input = 'a'.repeat(30);
      const result = sanitizeNickname(input);
      expect(result.length).toBe(24);
    });
  });

  describe('stripAllHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = stripAllHtml(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('containsSuspiciousPatterns', () => {
    it('should detect script tags', () => {
      const input = '<script>alert("XSS")</script>';
      expect(containsSuspiciousPatterns(input)).toBe(true);
    });

    it('should detect event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click</div>';
      expect(containsSuspiciousPatterns(input)).toBe(true);
    });

    it('should detect javascript: URIs', () => {
      const input = 'javascript:alert("XSS")';
      expect(containsSuspiciousPatterns(input)).toBe(true);
    });

    it('should pass safe content', () => {
      const input = 'Hello world, this is a normal message';
      expect(containsSuspiciousPatterns(input)).toBe(false);
    });
  });
});
