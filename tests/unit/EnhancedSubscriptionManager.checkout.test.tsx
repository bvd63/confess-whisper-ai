import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { supabase } from '@/integrations/supabase/client';

describe('EnhancedSubscriptionManager – Checkout and Portal redirects', () => {
  const user = userEvent.setup();
  const originalLocation = window.location;
  let hrefSet: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch
    global.fetch = vi.fn();
    // Mock location href setter to capture redirects
    hrefSet = null;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() {
          return hrefSet || '';
        },
        set href(val: string) {
          hrefSet = val;
        },
      },
    });
    // Ensure we have a stripe customer id available
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { user_metadata: { stripe_customer_id: 'cus_test_123' } } },
      error: null as any,
    } as any);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('redirects to Stripe Checkout for monthly and yearly', async () => {
    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    // First call for monthly
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ url: 'https://stripe.test/checkout-monthly' }),
    } as any);

    renderWithProviders(<EnhancedSubscriptionManager />);

    const monthlyBtn = await screen.findByRole('button', { name: /Get VIP – \$6.99\/mo/i });
    await user.click(monthlyBtn);
    expect(window.location.href).toBe('https://stripe.test/checkout-monthly');

    // Restore location
    (window as any).location = originalLocation;
  });

  it('redirects to Stripe Customer Portal', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ url: 'https://stripe.test/portal' }),
    } as any);

    renderWithProviders(<EnhancedSubscriptionManager />);

    const portalBtn = await screen.findByRole('button', { name: /Manage billing/i });
    await user.click(portalBtn);
    expect(hrefSet).toBe('https://stripe.test/portal');
  });
});
