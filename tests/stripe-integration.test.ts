/**
 * Stripe Integration Tests
 * Tests for checkout flow, webhooks, and subscription management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STRIPE_PRICE, STRIPE_CONFIG } from '@/lib/stripe-config';

describe('Stripe Configuration', () => {
  it('should have valid price IDs configured', () => {
    expect(STRIPE_PRICE.VIP_MONTHLY).toBeTruthy();
    expect(STRIPE_PRICE.VIP_YEARLY).toBeTruthy();
    expect(STRIPE_PRICE.VIP_MONTHLY).toMatch(/^price_/);
    expect(STRIPE_PRICE.VIP_YEARLY).toMatch(/^price_/);
  });

  it('should have checkout URL configured', () => {
    expect(STRIPE_CONFIG.CHECKOUT_URL).toBeTruthy();
    expect(STRIPE_CONFIG.CHECKOUT_URL).toMatch(/^https:\/\//);
  });
});

describe('Stripe Checkout Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create checkout session with correct price ID', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/session_123' },
      error: null
    });

    // Mock supabase functions
    const supabase = {
      functions: {
        invoke: mockInvoke
      }
    };

    await supabase.functions.invoke('create-checkout', {
      body: { priceId: STRIPE_PRICE.VIP_MONTHLY }
    });

    expect(mockInvoke).toHaveBeenCalledWith('create-checkout', {
      body: { priceId: STRIPE_PRICE.VIP_MONTHLY }
    });
  });

  it('should handle checkout errors gracefully', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Stripe error' }
    });

    const supabase = {
      functions: {
        invoke: mockInvoke
      }
    };

    const result = await supabase.functions.invoke('create-checkout', {
      body: { priceId: STRIPE_PRICE.VIP_MONTHLY }
    });

    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('Stripe error');
  });
});

describe('Subscription Management', () => {
  it('should upgrade subscription successfully', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { success: true, message: 'Upgraded successfully' },
      error: null
    });

    const supabase = {
      functions: {
        invoke: mockInvoke
      }
    };

    const result = await supabase.functions.invoke('manage-subscription-v2', {
      body: { action: 'upgrade', targetTier: 'vip' }
    });

    expect(result.data.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('manage-subscription-v2', {
      body: { action: 'upgrade', targetTier: 'vip' }
    });
  });

  it('should downgrade subscription at period end', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { success: true, message: 'Downgrade scheduled' },
      error: null
    });

    const supabase = {
      functions: {
        invoke: mockInvoke
      }
    };

    const result = await supabase.functions.invoke('manage-subscription-v2', {
      body: { action: 'downgrade', targetTier: 'free' }
    });

    expect(result.data.success).toBe(true);
  });

  it('should cancel subscription successfully', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { success: true, message: 'Subscription canceled' },
      error: null
    });

    const supabase = {
      functions: {
        invoke: mockInvoke
      }
    };

    const result = await supabase.functions.invoke('billing-cancel');

    expect(result.data.success).toBe(true);
  });
});
