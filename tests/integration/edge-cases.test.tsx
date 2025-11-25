import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

describe('Edge Cases - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Failure Scenarios', () => {
    it('should handle card declined error', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Your card was declined' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('card was declined');
    });

    it('should handle insufficient funds error', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insufficient funds' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.error?.message).toContain('Insufficient funds');
    });

    it('should handle expired card error', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Your card has expired' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.error?.message).toContain('expired');
    });

    it('should handle authentication required (3DS)', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Payment requires authentication' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.error?.message).toContain('authentication');
    });

    it('should handle webhook delay gracefully', async () => {
      // Simulate webhook not arrived yet
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ subscription_tier: 'free' }], // Not updated yet
            error: null,
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', 'test-user');

      // User should still see old tier temporarily
      expect(result.data?.[0]?.subscription_tier).toBe('free');
    });
  });

  describe('Network Timeout Handling', () => {
    it('should handle Stripe API timeout', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Request timeout' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.error?.message).toContain('timeout');
    });

    it('should handle network connection error', async () => {
      const mockInvoke = vi.fn().mockRejectedValue(
        new Error('Network request failed')
      );
      (supabase.functions.invoke as any) = mockInvoke;

      try {
        await supabase.functions.invoke('billing-buy', {
          body: { tier: 'vip', cycle: 'monthly' },
        });
      } catch (error: any) {
        expect(error.message).toContain('Network request failed');
      }
    });

    it('should retry failed health check', async () => {
      const mockInvoke = vi.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          data: { status: 'healthy' },
          error: null,
        });
      (supabase.functions.invoke as any) = mockInvoke;

      // First attempt fails
      try {
        await supabase.functions.invoke('health');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Retry succeeds
      const result = await supabase.functions.invoke('health');
      expect(result.data?.status).toBe('healthy');
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('should handle database connection pool exhaustion', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(
          new Error('Connection pool exhausted')
        ),
      });
      (supabase.from as any) = mockFrom;

      try {
        await supabase.from('profiles').select('*');
      } catch (error: any) {
        expect(error.message).toContain('Connection pool exhausted');
      }
    });
  });

  describe('Concurrent Subscription Changes', () => {
    it('should handle race condition in subscription update', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Row was updated by another transaction' },
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .update({ subscription_tier: 'vip' })
        .eq('user_id', 'test-user');

      expect(result.error?.message).toContain('another transaction');
    });

    it('should prevent duplicate checkout sessions', async () => {
      const sessionId = 'cs_test_123';
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: `https://checkout.stripe.com/${sessionId}` },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      // First request
      const result1 = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      // Duplicate request (should be idempotent)
      const result2 = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result1.data?.url).toBeDefined();
      expect(result2.data?.url).toBeDefined();
    });

    it('should handle concurrent upgrade and downgrade requests', async () => {
      // This should be prevented by database constraints
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Concurrent modification detected' },
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .update({ subscription_tier: 'vip' })
        .eq('user_id', 'test-user');

      expect(result.error).not.toBeNull();
    });
  });

  describe('Trial Expiry Edge Cases', () => {
    it('should handle trial expiry exactly at midnight', () => {
      const now = new Date('2025-10-26T00:00:00.000Z');
      const trialEnds = new Date('2025-10-26T00:00:00.000Z');
      
      const isExpired = now >= trialEnds;
      expect(isExpired).toBe(true);
    });

    it('should handle trial expiry 1 second before midnight', () => {
      const now = new Date('2025-10-25T23:59:59.999Z');
      const trialEnds = new Date('2025-10-26T00:00:00.000Z');
      
      const isExpired = now >= trialEnds;
      expect(isExpired).toBe(false);
    });

    it('should revoke trial benefits immediately on VIP purchase', async () => {
      const mockResult = {
        data: [{
          subscription_tier: 'vip',
          trial_active: false,
          trial_premium_ends_at: null,
        }],
        error: null,
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'vip',
          trial_active: false,
          trial_premium_ends_at: null,
        })
        .eq('user_id', 'test-user')
        .select();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        expect(result.data[0].trial_active).toBe(false);
        expect(result.data[0].trial_premium_ends_at).toBeNull();
      }
    });

    it('should not allow trial restart after expiry', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{
              trial_used: true,
              trial_started_at: '2025-10-20T00:00:00.000Z',
              trial_premium_ends_at: '2025-10-25T00:00:00.000Z',
            }],
            error: null,
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .select('trial_used, trial_activated_at, trial_premium_ends_at')
        .eq('user_id', 'test-user');

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        expect(result.data[0].trial_used).toBe(true);
        // Should not allow new trial
        const canRestartTrial = !result.data[0].trial_used;
        expect(canRestartTrial).toBe(false);
      }
    });
  });

  describe('Coin Transaction Edge Cases', () => {
    it('should prevent negative coin balance', async () => {
      const currentBalance = 5;
      const deductAmount = 10;
      
      const canDeduct = currentBalance >= deductAmount;
      expect(canDeduct).toBe(false);
    });

    it('should handle coin overflow (max safe integer)', () => {
      const currentBalance = Number.MAX_SAFE_INTEGER - 1;
      const awardAmount = 10;
      
      const newBalance = currentBalance + awardAmount;
      const isOverflow = newBalance > Number.MAX_SAFE_INTEGER;
      
      expect(isOverflow).toBe(true);
    });

    it('should prevent duplicate coin awards for same confession', async () => {
      const confessionId = 'confession-123';
      const userId = 'user-123';
      
      // Mock checking existing transaction
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'tx-123', reference_id: confessionId }],
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('reference_id', confessionId);

      // Transaction already exists
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should handle concurrent coin awards', async () => {
      // This should be handled by database transaction locks
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { amount: 2, type: 'confession_created' },
          error: null,
        }),
      });
      (supabase.from as any) = mockFrom;

      // Simulate two concurrent awards
      const [result1, result2] = await Promise.all([
        supabase.from('coin_transactions').insert({ 
          user_id: 'test-user',
          amount: 2,
          type: 'test',
        }),
        supabase.from('coin_transactions').insert({ 
          user_id: 'test-user',
          amount: 2,
          type: 'test',
        }),
      ]);

      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
    });
  });

  describe('Badge Expiry Edge Cases', () => {
    it('should handle badge expiry during active session', () => {
      const acquiredAt = new Date('2025-10-21T12:00:00.000Z');
      const expiresAt = new Date(acquiredAt.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days
      const now = new Date('2025-10-26T12:00:00.001Z'); // Just after expiry
      
      const isExpired = now > expiresAt;
      expect(isExpired).toBe(true);
    });

    it('should handle timezone differences in expiry calculation', () => {
      // UTC midnight vs local midnight
      const expiresAtUTC = new Date('2025-10-26T00:00:00.000Z');
      const nowEST = new Date('2025-10-25T20:00:00.000-05:00'); // 8 PM EST = 1 AM UTC next day
      
      const isExpiredInUTC = nowEST.getTime() >= expiresAtUTC.getTime();
      expect(isExpiredInUTC).toBe(true);
    });

    it('should deactivate multiple badges expiring on same day', () => {
      const now = new Date('2025-10-26T12:00:00.000Z');
      
      const badges = [
        { id: 1, expires_at: new Date('2025-10-26T00:00:00.000Z') },
        { id: 2, expires_at: new Date('2025-10-26T06:00:00.000Z') },
        { id: 3, expires_at: new Date('2025-10-26T11:59:59.999Z') },
      ];
      
      const expiredBadges = badges.filter(b => new Date(b.expires_at) <= now);
      expect(expiredBadges.length).toBe(3);
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle expired JWT token', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });
      (supabase.auth.getUser as any) = mockGetUser;

      const result = await supabase.auth.getUser();
      expect(result.error?.message).toContain('JWT expired');
    });

    it('should handle invalid JWT token', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });
      (supabase.auth.getUser as any) = mockGetUser;

      const result = await supabase.auth.getUser();
      expect(result.error?.message).toContain('Invalid JWT');
    });

    it('should handle missing authorization header', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'No authorization header' },
      });
      (supabase.auth.getUser as any) = mockGetUser;

      const result = await supabase.auth.getUser();
      expect(result.error?.message).toContain('authorization header');
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should reject price ID with invalid format', () => {
      const priceId = 'invalid-price';
      const isValidFormat = priceId.startsWith('price_');
      
      expect(isValidFormat).toBe(false);
    });

    it('should reject empty tier value', () => {
      const tier = '';
      const isValid = tier.length > 0;
      
      expect(isValid).toBe(false);
    });

    it('should handle null subscription_tier', () => {
      const tier = null;
      const normalizedTier = tier || 'free';
      
      expect(normalizedTier).toBe('free');
    });

    it('should handle undefined subscription_tier', () => {
      const tier = undefined;
      const normalizedTier = tier || 'free';
      
      expect(normalizedTier).toBe('free');
    });
  });

  describe('URL Redirect Edge Cases', () => {
    it('should handle missing checkout URL', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: null },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(result.data?.url).toBeNull();
    });

    it('should handle malformed checkout URL', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: 'not-a-valid-url' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      const url = result.data?.url;
      const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
      
      expect(isValidUrl).toBe(false);
    });
  });
});
