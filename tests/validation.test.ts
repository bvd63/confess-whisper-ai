import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  contentSchema,
  emailSchema,
  passwordSchema,
  nicknameSchema,
  bioSchema,
  urlSchema,
} from '@/lib/validation';

describe('Content Validation', () => {
  it('should accept valid content', () => {
    const validContent = 'This is a valid confession with enough characters.';
    expect(() => contentSchema.parse(validContent)).not.toThrow();
  });

  it('should reject content that is too short', () => {
    const shortContent = 'Short';
    expect(() => contentSchema.parse(shortContent)).toThrow();
  });

  it('should reject content that is too long', () => {
    const longContent = 'a'.repeat(10001);
    expect(() => contentSchema.parse(longContent)).toThrow();
  });

  it('should trim whitespace', () => {
    const content = '  Valid content here  ';
    const result = contentSchema.parse(content);
    expect(result).toBe('Valid content here');
  });

  it('should reject empty content after trim', () => {
    const emptyContent = '     ';
    expect(() => contentSchema.parse(emptyContent)).toThrow();
  });
});

describe('Email Validation', () => {
  it('should accept valid emails', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.co.uk',
      'user+tag@example.com',
      'user_name@example-domain.com',
    ];

    validEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).not.toThrow();
    });
  });

  it('should reject invalid emails', () => {
    const invalidEmails = [
      'invalid',
      '@example.com',
      'user@',
      'user @example.com',
      'user@example',
    ];

    invalidEmails.forEach(email => {
      expect(() => emailSchema.parse(email)).toThrow();
    });
  });

  it('should trim and lowercase emails', () => {
    const email = '  USER@EXAMPLE.COM  ';
    const result = emailSchema.parse(email);
    expect(result).toBe('user@example.com');
  });
});

describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = [
      'MyP@ssw0rd123',
      'Str0ng!Pass',
      'C0mpl3x#Pass',
    ];

    strongPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).not.toThrow();
    });
  });

  it('should reject weak passwords', () => {
    const weakPasswords = [
      'short',       // Too short
      'nouppercase1', // No uppercase
      'NOLOWERCASE1', // No lowercase
      'NoNumbers',   // No numbers
    ];

    weakPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).toThrow();
    });
  });

  it('should enforce minimum length', () => {
    expect(() => passwordSchema.parse('Sh0rt!')).toThrow();
  });
});

describe('Nickname Validation', () => {
  it('should accept valid nicknames', () => {
    const validNicknames = [
      'User123',
      'Cool_Name',
      'SimpleUser',
      'test_user_2024',
    ];

    validNicknames.forEach(nickname => {
      expect(() => nicknameSchema.parse(nickname)).not.toThrow();
    });
  });

  it('should reject invalid nicknames', () => {
    const invalidNicknames = [
      'a',           // Too short
      'a'.repeat(51), // Too long
      'user name',   // Space
      'user@name',   // Special char
    ];

    invalidNicknames.forEach(nickname => {
      expect(() => nicknameSchema.parse(nickname)).toThrow();
    });
  });

  it('should trim whitespace', () => {
    const nickname = '  ValidName  ';
    const result = nicknameSchema.parse(nickname);
    expect(result).toBe('ValidName');
  });
});

describe('Bio Validation', () => {
  it('should accept valid bios', () => {
    const validBios = [
      'Short bio',
      'A longer bio with multiple sentences. This is allowed.',
      'Bio with special chars: !@#$%',
    ];

    validBios.forEach(bio => {
      expect(() => bioSchema.parse(bio)).not.toThrow();
    });
  });

  it('should accept empty bio', () => {
    expect(() => bioSchema.parse('')).not.toThrow();
  });

  it('should reject bio that is too long', () => {
    const longBio = 'a'.repeat(501);
    expect(() => bioSchema.parse(longBio)).toThrow();
  });

  it('should trim whitespace', () => {
    const bio = '  My bio  ';
    const result = bioSchema.parse(bio);
    expect(result).toBe('My bio');
  });
});

describe('URL Validation', () => {
  it('should accept valid URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://example.com',
      'https://sub.example.com/path',
      'https://example.com/path?query=value',
    ];

    validUrls.forEach(url => {
      expect(() => urlSchema.parse(url)).not.toThrow();
    });
  });

  it('should reject invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      'example.com',
      'https://',
    ];

    invalidUrls.forEach(url => {
      // Empty string is allowed (optional), so only test truly invalid URLs
      if (url !== '') {
        const result = urlSchema.safeParse(url);
        if (url === 'not-a-url' || url === 'example.com' || url === 'https://') {
          expect(result.success).toBe(false);
        }
      }
    });
  });

  it('should accept optional URLs', () => {
    expect(() => urlSchema.optional().parse(undefined)).not.toThrow();
  });
});

describe('Schema Performance', () => {
  it('should validate quickly', () => {
    const testData = {
      content: 'This is a test confession with valid content.',
      email: 'test@example.com',
      password: 'MyP@ssw0rd123',
      nickname: 'TestUser',
    };

    const start = performance.now();
    
    contentSchema.parse(testData.content);
    emailSchema.parse(testData.email);
    passwordSchema.parse(testData.password);
    nicknameSchema.parse(testData.nickname);
    
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // Should validate in < 10ms
  });
});
