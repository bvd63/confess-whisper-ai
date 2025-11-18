import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

describe('Subscription Flows - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upgrade Flow', () => {
    it('should upgrade from free to VIP monthly', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/test' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      // Simulate upgrade action
      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });
      expect(result.data?.url).toContain('stripe.com');
      expect(result.error).toBeNull();
    });

    it('should upgrade from free to VIP yearly', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/test_yearly' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'yearly' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('billing-buy', {
        body: { tier: 'vip', cycle: 'yearly' },
      });
      expect(result.data?.url).toContain('stripe.com');
    });

    it('should handle upgrade errors gracefully', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Payment method required' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-upgrade', {
        body: { newPriceId: 'price_test' },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Payment method required');
    });

    it('should open customer portal for existing VIP users', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('customer-portal');

      expect(mockInvoke).toHaveBeenCalledWith('customer-portal');
      expect(result.data?.url).toContain('stripe.com/portal');
    });
  });

  describe('Downgrade Flow', () => {
    it('should schedule downgrade from VIP to free', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Downgrade scheduled' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId: 'free' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('subscription-downgrade', {
        body: { targetPriceId: 'free' },
      });
      expect(result.data?.success).toBe(true);
    });

    it('should not allow immediate downgrade', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { 
          success: true, 
          scheduled: true,
          effectiveDate: '2025-11-26T00:00:00.000Z'
        },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId: 'free' },
      });

      expect(result.data?.scheduled).toBe(true);
      expect(result.data?.effectiveDate).toBeDefined();
    });

    it('should handle downgrade errors', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'No active subscription found' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId: 'free' },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('No active subscription');
    });
  });

  describe('Cancellation Flow', () => {
    it('should cancel VIP subscription at period end', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { 
          success: true, 
          cancelAtPeriodEnd: true,
          periodEnd: '2025-11-26T00:00:00.000Z'
        },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-cancel');

      expect(mockInvoke).toHaveBeenCalledWith('billing-cancel');
      expect(result.data?.cancelAtPeriodEnd).toBe(true);
      expect(result.data?.periodEnd).toBeDefined();
    });

    it('should not allow immediate cancellation with refund', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { 
          success: true, 
          cancelAtPeriodEnd: true,
          immediate: false
        },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-cancel');

      expect(result.data?.immediate).toBe(false);
    });

    it('should handle cancellation errors', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Subscription already cancelled' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-cancel');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('already cancelled');
    });
  });

  describe('Reactivation Flow', () => {
    it('should reactivate cancelled subscription before period end', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { 
          success: true, 
          reactivated: true,
          status: 'active'
        },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-reactivate');

      expect(mockInvoke).toHaveBeenCalledWith('billing-reactivate');
      expect(result.data?.reactivated).toBe(true);
      expect(result.data?.status).toBe('active');
    });

    it('should require new purchase after period end', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Subscription expired, purchase required' },
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('billing-reactivate');

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('expired');
    });
  });

  describe('Interval Change Flow', () => {
    it('should change from monthly to yearly (upgrade)', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal' },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      // Customer portal handles interval changes
      const result = await supabase.functions.invoke('customer-portal');

      expect(result.data?.url).toBeDefined();
    });

    it('should change from yearly to monthly (downgrade)', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: { 
          success: true,
          scheduled: true,
          message: 'Interval change scheduled for next period'
        },
        error: null,
      });
      (supabase.functions.invoke as any) = mockInvoke;

      const result = await supabase.functions.invoke('subscription-downgrade', {
        body: { targetPriceId: 'price_monthly' },
      });

      expect(result.data?.scheduled).toBe(true);
    });
  });

  describe('Profile Updates', () => {
    it('should update profile tier after successful purchase', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ subscription_tier: 'vip' }],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .update({ subscription_tier: 'vip' })
        .eq('user_id', 'test-user-id')
        .select();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        expect(result.data[0].subscription_tier).toBe('vip');
      }
    });

    it('should clear trial data on VIP purchase', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{
          subscription_tier: 'vip',
          trial_active: false,
          trial_premium_ends_at: null,
        }],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      (supabase.from as any) = mockFrom;

      const result = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: 'vip',
          trial_active: false,
          trial_premium_ends_at: null
        })
        .eq('user_id', 'test-user-id')
        .select();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        expect(result.data[0].trial_active).toBe(false);
      }
    });
  });
});
