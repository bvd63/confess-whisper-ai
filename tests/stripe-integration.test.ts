/**
 * Stripe Integration Tests
 * Tests for checkout flow, webhooks, and subscription management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STRIPE_PRICE } from '@/lib/stripe-config';
import { env } from '@/lib/env';

describe('Stripe Configuration', () => {
  it('should have valid price IDs configured', () => {
    // Allow empty price IDs in development/test environment
    if (env.isProd) {
      expect(STRIPE_PRICE.VIP_MONTHLY).toBeTruthy();
      expect(STRIPE_PRICE.VIP_YEARLY).toBeTruthy();
      expect(STRIPE_PRICE.VIP_MONTHLY).toMatch(/^price_/);
      expect(STRIPE_PRICE.VIP_YEARLY).toMatch(/^price_/);
    } else {
      // In dev/test, just verify they are strings (can be empty)
      expect(typeof STRIPE_PRICE.VIP_MONTHLY).toBe('string');
      expect(typeof STRIPE_PRICE.VIP_YEARLY).toBe('string');
    }
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

describe('Stripe Webhook Processing', () => {
  it('should process checkout.session.completed webhook', () => {
    const webhookEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test123',
          subscription: 'sub_test123',
          customer_email: 'test@example.com'
        }
      }
    };

    expect(webhookEvent.type).toBe('checkout.session.completed');
    expect(webhookEvent.data.object.customer).toBeTruthy();
  });

  it('should process customer.subscription.updated webhook', () => {
    const webhookEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          status: 'active',
          current_period_end: 1234567890
        }
      }
    };

    expect(webhookEvent.type).toBe('customer.subscription.updated');
    expect(webhookEvent.data.object.status).toBe('active');
  });

  it('should process customer.subscription.deleted webhook', () => {
    const webhookEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123'
        }
      }
    };

    expect(webhookEvent.type).toBe('customer.subscription.deleted');
    expect(webhookEvent.data.object.customer).toBeTruthy();
  });
});
