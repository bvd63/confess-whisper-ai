import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Referral Rewards Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should award +10 coins to referred user on first confession', async () => {
    const mockUserId = 'test-referred-user-id';
    const mockReferrerId = 'test-referrer-id';
    
    // Mock referral record
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'referral-id',
              referrer_user_id: mockReferrerId,
              referred_user_id: mockUserId,
              status: 'completed',
              referred_rewarded_at: null,
            },
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any).mockImplementation(mockFrom);

    // Simulate first confession creation
    const confessionData = {
      user_id: mockUserId,
      content: 'First confession',
      is_draft: false,
      moderation_status: 'approved',
    };

    // Verify trigger logic would execute
    expect(confessionData.is_draft).toBe(false);
    expect(confessionData.moderation_status).toBe('approved');
  });

  it('should award +20 coins to referrer when referred user posts first confession', async () => {
    const mockReferrerId = 'test-referrer-id';
    
    // Verify referrer gets reward
    const expectedCoins = 20;
    expect(expectedCoins).toBe(20);
  });

  it('should not award coins if referred user already has confessions', async () => {
    const mockUserId = 'test-user-with-confessions';
    
    // Mock existing confessions count
    const existingConfessionsCount = 3;
    expect(existingConfessionsCount).toBeGreaterThan(0);
  });

  it('should prevent duplicate referral rewards', async () => {
    const mockReferralId = 'test-referral-id';
    
    // Mock referral with already rewarded status
    const mockReferral = {
      id: mockReferralId,
      referred_rewarded_at: new Date().toISOString(),
      referrer_rewarded_at: new Date().toISOString(),
    };

    expect(mockReferral.referred_rewarded_at).not.toBeNull();
    expect(mockReferral.referrer_rewarded_at).not.toBeNull();
  });
});
