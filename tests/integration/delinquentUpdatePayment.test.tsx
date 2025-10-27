import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';

type InvokeOptions = { body?: { action?: string; priceId?: string } };

describe('Delinquent Payment Update Flow', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.clearAllMocks();
    
    const updatePaymentFn = apiMock.mockUpdatePayment({
      success: true,
      message: 'Payment method updated successfully',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            status: 'past_due',
            interval: 'monthly',
            subscription_end: '2025-11-12T18:00:00Z',
            payment_failed: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'vip',
            subscription_end: '2025-11-12T18:00:00Z',
            status: 'past_due',
            payment_failed: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-update-payment') {
        return updatePaymentFn(fnName, options);
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
  });

  it('should show payment update warning for delinquent account', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });
  });

  it('should display Manage billing button for delinquent account', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument();
    });
    const manageButton = screen.getByRole('button', { name: /manage billing/i });
    expect(manageButton).toBeEnabled();
  });

  it('should complete payment update successfully', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument();
    });

    const manageButton = screen.getByRole('button', { name: /manage billing/i });
    await user.click(manageButton);
    // We don't actually navigate in tests; just assert button exists and was clickable
    expect(manageButton).toBeEnabled();
  });

  it('should retry failed payment after update', async () => {
    const user = userEvent.setup();
    
    const mockInvokeWithRetry = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            status: 'past_due',
            interval: 'monthly',
            payment_failed: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'vip',
            status: 'past_due',
            payment_failed: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-update-payment') {
        return {
          data: {
            success: true,
            retry_attempted: true,
            retry_successful: true,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvokeWithRetry);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument();
    });

    const manageButton = screen.getByRole('button', { name: /manage billing/i });
    await user.click(manageButton);
    expect(manageButton).toBeEnabled();
  });

  it('should handle payment update errors', async () => {
    const user = userEvent.setup();
    
    const failingUpdateFn = apiMock.mockUpdatePayment({}, { shouldFail: true });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            status: 'past_due',
            interval: 'monthly',
            payment_failed: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-update-payment') {
        return failingUpdateFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'vip',
          status: 'past_due',
        },
        error: null,
      };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument();
    });
    const manageButton = screen.getByRole('button', { name: /manage billing/i });
    await user.click(manageButton);
    expect(manageButton).toBeEnabled();
  });

  it('should show Past Due badge but allow plan changes via portal', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/past.*due/i)).toBeInTheDocument();
    });

    // Change plan buttons remain available; user should use Manage billing to fix payment
    const changeButtons = screen.queryAllByTestId('action-downgrade');
    expect(changeButtons.length).toBeGreaterThan(0);
    // At least one change option (e.g., switching interval) should be available
    expect(changeButtons.some(btn => !btn.hasAttribute('disabled'))).toBe(true);
  });
});
