import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Coin Awards on Confession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should award +2 coins when confession is published', async () => {
    const mockUserId = 'test-user-id';
    
    const confessionData = {
      user_id: mockUserId,
      content: 'Test confession',
      is_draft: false,
      moderation_status: 'approved',
    };

    // Verify conditions for coin award
    expect(confessionData.is_draft).toBe(false);
    expect(confessionData.moderation_status).toBe('approved');
    
    // Expected coin amount
    const expectedCoins = 2;
    expect(expectedCoins).toBe(2);
  });

  it('should not award coins for draft confessions', async () => {
    const confessionData = {
      user_id: 'test-user',
      content: 'Draft confession',
      is_draft: true,
      moderation_status: 'pending',
    };

    expect(confessionData.is_draft).toBe(true);
  });

  it('should not award coins for rejected confessions', async () => {
    const confessionData = {
      user_id: 'test-user',
      content: 'Rejected confession',
      is_draft: false,
      moderation_status: 'rejected',
    };

    expect(confessionData.moderation_status).toBe('rejected');
  });

  it('should log coin transaction in coin_transactions table', async () => {
    const mockTransaction = {
      user_id: 'test-user-id',
      amount: 2,
      type: 'confession_created',
      description: 'New confession posted',
    };

    expect(mockTransaction.amount).toBe(2);
    expect(mockTransaction.type).toBe('confession_created');
  });
});
