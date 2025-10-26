import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCsrfToken,
  storeCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  addCsrfHeader,
  clearCsrfToken,
} from '@/lib/security/csrf';

describe('CSRF Protection', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  describe('generateCsrfToken', () => {
    it('should generate a token', () => {
      const token = generateCsrfToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('storeCsrfToken and getCsrfToken', () => {
    it('should store and retrieve token', () => {
      const token = 'test-token-123';
      storeCsrfToken(token);
      const retrieved = getCsrfToken();
      expect(retrieved).toBe(token);
    });

    it('should generate token if not exists', () => {
      const token = getCsrfToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('validateCsrfToken', () => {
    it('should validate correct token', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      expect(validateCsrfToken(token)).toBe(true);
    });

    it('should reject incorrect token', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      expect(validateCsrfToken('wrong-token')).toBe(false);
    });

    it('should reject empty token', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      expect(validateCsrfToken('')).toBe(false);
    });
  });

  describe('addCsrfHeader', () => {
    it('should add CSRF token to headers', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      
      const headers = addCsrfHeader();
      expect(headers).toHaveProperty('X-CSRF-Token');
      expect((headers as any)['X-CSRF-Token']).toBe(token);
    });

    it('should preserve existing headers', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      
      const existingHeaders = { 'Content-Type': 'application/json' };
      const headers = addCsrfHeader(existingHeaders);
      
      expect((headers as any)['Content-Type']).toBe('application/json');
      expect((headers as any)['X-CSRF-Token']).toBe(token);
    });
  });

  describe('clearCsrfToken', () => {
    it('should clear stored token', () => {
      const token = generateCsrfToken();
      storeCsrfToken(token);
      
      clearCsrfToken();
      
      // Should generate new token since old one is cleared
      const newToken = getCsrfToken();
      expect(newToken).not.toBe(token);
    });
  });
});
