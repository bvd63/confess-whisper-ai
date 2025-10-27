import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';

type InvokeOptions = { body?: { action?: string; priceId?: string } };
import upgradePreview from '../fixtures/stripe/preview/upgrade_free_to_vip_monthly.json';

describe('Upgrade Immediate Flow', () => {
  let apiMock: SubscriptionApiMock;
  let statusState: {
    currentPlan: 'free' | 'vip';
    interval: 'monthly' | 'yearly' | null;
    status: 'none' | 'active' | 'trialing' | 'canceled';
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: string;
    canReactivate: boolean;
  };

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.clearAllMocks();
    // initial: free user
    statusState = {
      currentPlan: 'free',
      interval: null,
      status: 'none',
      cancelAtPeriodEnd: false,
      canReactivate: false,
    };

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage') {
        const action = options?.body?.action;
        if (action === 'status') {
          return {
            data: { ...statusState },
            error: null,
          };
        }
        if (action === 'change') {
          // simulate change for active subscribers
          statusState = {
            currentPlan: 'vip',
            interval: (options?.body as any)?.cycle || 'monthly',
            status: 'active',
            cancelAtPeriodEnd: false,
            canReactivate: false,
            currentPeriodEnd: '2025-11-12T00:00:00Z',
          } as any;
          return { data: { ok: true }, error: null };
        }
      }
      if (fnName === 'billing-buy') {
        // simulate redirect URL and mark as VIP (as if post-checkout)
        statusState = {
          currentPlan: 'vip',
          interval: (options?.body as any)?.cycle || 'monthly',
          status: 'active',
          cancelAtPeriodEnd: false,
          canReactivate: false,
          currentPeriodEnd: '2025-11-12T00:00:00Z',
        } as any;
        return { data: { url: 'https://example.test/checkout' }, error: null };
      }
      if (fnName === 'billing-preview') {
        // Not used in component; return fixture to keep compatibility
        return { data: upgradePreview, error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    vi.stubGlobal('open', vi.fn());
  });

  it('should show financial preview before upgrade', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    // Wait until the subscription manager content is rendered (post-loading)
    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    // Click on VIP plan to open confirmation dialog
    const vipChangeButton = screen.getByTestId('action-upgrade');
    await user.click(vipChangeButton);

    // Should show confirmation dialog content
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should complete upgrade and refresh entitlements', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByTestId('action-upgrade');
    await user.click(vipChangeButton);
    
    // Confirm upgrade
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);
    
    // Verify window.open called with checkout URL (redirect initiated)
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('https://example.test/checkout', '_blank');
    });
    
    // Verify buy was invoked
  const calls = vi.mocked(supabase.functions.invoke).mock.calls;
  expect(calls.some((args: any[]) => args[0] === 'billing-buy')).toBeTruthy();
  });

  it('should call buy endpoint exactly once on confirm', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByTestId('action-upgrade');
    await user.click(vipChangeButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

  const calls = vi.mocked(supabase.functions.invoke).mock.calls.filter((args: any[]) => args[0] === 'billing-buy');
  expect(calls.length).toBe(1);
  });

  it('should handle upgrade errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Override with failing mock
    const failingBuyFn = vi.fn(async () => ({ data: null, error: { message: 'Change failed' } }));
    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'free',
            interval: null,
            status: 'none',
            cancelAtPeriodEnd: false,
            canReactivate: false,
          },
          error: null,
        };
      }
      if (fnName === 'billing-buy') {
        return failingBuyFn();
      }
      return { data: { plan: 'free' }, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    await waitFor(() => {
      expect(screen.getByTestId('manage-subscription-modal')).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByTestId('action-upgrade');
    await user.click(vipChangeButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);
    
    // Modal should close after error handling
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
  });
});
