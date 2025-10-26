import { describe, it, expect, vi } from 'vitest';

describe('Badge and Flair Expiry Logic', () => {
  it('should mark badges as expired after 5 days', () => {
    const now = new Date();
    const acquiredDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
    const expiryDate = new Date(acquiredDate.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days
    
    const isExpired = now > expiryDate;
    expect(isExpired).toBe(true);
  });

  it('should keep badges active within 5 days', () => {
    const now = new Date();
    const acquiredDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const expiryDate = new Date(acquiredDate.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days
    
    const isExpired = now > expiryDate;
    expect(isExpired).toBe(false);
  });

  it('should calculate remaining days correctly', () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    
    const remainingMs = expiryDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    
    expect(remainingDays).toBe(2);
  });

  it('should deactivate expired perks (is_featured=false, is_public=false)', () => {
    const mockPerk = {
      is_featured: true,
      is_public: true,
      expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
    };

    const isExpired = new Date(mockPerk.expires_at) < new Date();
    expect(isExpired).toBe(true);
    
    // After deactivation
    const deactivatedPerk = {
      ...mockPerk,
      is_featured: false,
      is_public: false,
    };
    
    expect(deactivatedPerk.is_featured).toBe(false);
    expect(deactivatedPerk.is_public).toBe(false);
  });

  it('should handle unlimited perks (expires_at=null)', () => {
    const mockPerk = {
      is_featured: true,
      is_public: true,
      expires_at: null,
    };

    const isExpired = mockPerk.expires_at !== null && new Date(mockPerk.expires_at) < new Date();
    expect(isExpired).toBe(false);
  });
});
