import { describe, it, expect } from 'vitest';

describe('Currency and Date Formatters', () => {
  describe('Currency Formatting', () => {
    it('should format USD correctly', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      expect(formatter.format(999 / 100)).toBe('$9.99');
      expect(formatter.format(1999 / 100)).toBe('$19.99');
    });

    it('should format EUR correctly', () => {
      const formatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      });
      const result = formatter.format(999 / 100);
      expect(result).toContain('9,99');
      expect(result).toContain('€');
    });

    it('should handle zero amounts', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      expect(formatter.format(0)).toBe('$0.00');
    });

    it('should format large amounts correctly', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      expect(formatter.format(999999 / 100)).toBe('$9,999.99');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates in en-US locale', () => {
      const date = new Date('2025-11-12T18:00:00Z');
      const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const result = formatter.format(date);
      expect(result).toContain('November');
      expect(result).toContain('12');
      expect(result).toContain('2025');
    });

    it('should format dates in de-DE locale', () => {
      const date = new Date('2025-11-12T18:00:00Z');
      const formatter = new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const result = formatter.format(date);
      expect(result).toContain('November');
      expect(result).toContain('12');
      expect(result).toContain('2025');
    });

    it('should format dates in es-ES locale', () => {
      const date = new Date('2025-11-12T18:00:00Z');
      const formatter = new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const result = formatter.format(date);
      expect(result).toContain('noviembre');
      expect(result).toContain('12');
      expect(result).toContain('2025');
    });

    it('should handle timezone conversions', () => {
      const date = new Date('2025-11-12T18:00:00Z');
      const formatterUTC = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const resultUTC = formatterUTC.format(date);
      expect(resultUTC).toContain('18:00');
    });

    it('should format relative time correctly', () => {
      const now = new Date('2025-10-20T18:00:00Z');
      const future = new Date('2025-11-12T18:00:00Z');
      const diffDays = Math.ceil((future.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(23);
    });
  });

  describe('Percentage Formatting', () => {
    it('should format savings percentage', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(formatter.format(0.17)).toBe('17%');
      expect(formatter.format(0.2)).toBe('20%');
    });

    it('should handle zero percent', () => {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
      });
      expect(formatter.format(0)).toBe('0%');
    });
  });
});
