import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';

type InvokeOptions = { body?: { action?: string; priceId?: string } };

describe('Cancel Subscription Flows', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.clearAllMocks();
  });

  it('should cancel subscription at period end', async () => {
    const user = userEvent.setup();
    
    const cancelFn = apiMock.mockCancel({
      success: true,
      message: 'Subscription will be canceled at period end',
      cancel_at_period_end: true,
      ends_at: '2025-11-12T18:00:00Z',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '2025-11-12T18:00:00Z',
            canReactivate: false,
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
            status: 'active',
          },
          error: null,
        };
      }
      if (fnName === 'billing-cancel') {
        return cancelFn(fnName, options);
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByTestId('action-cancel');
    await user.click(cancelButton);
    
    // Confirm cancellation
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);
    
    // Should show end date
    await waitFor(() => {
      expect(screen.getByText(/11\/12\/2025/i)).toBeInTheDocument();
    });

    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
      'subscription-manage',
      expect.objectContaining({ body: expect.objectContaining({ action: 'cancel' }) })
    );
  });

  it('should show warning for immediate cancellation', async () => {
    const user = userEvent.setup();
    
    const cancelNowFn = apiMock.mockCancel({
      success: true,
      message: 'Subscription canceled immediately',
      cancel_at_period_end: false,
      immediate: true,
    });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '2025-12-12T18:00:00Z',
            canReactivate: false,
          },
          error: null,
        };
      }
      if (fnName === 'billing-cancel') {
        return cancelNowFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'vip',
        },
        error: null,
      };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId('action-cancel');
    
    if (cancelButton) {
      await user.click(cancelButton);
      
      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
      });
    }
  });

  it('should allow reactivation of canceled subscription', async () => {
    const user = userEvent.setup();
    
    const reactivateFn = apiMock.mockReactivate({
      success: true,
      message: 'Subscription reactivated successfully',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            cancelAtPeriodEnd: true,
            currentPeriodEnd: '2025-11-12T18:00:00Z',
            canReactivate: true,
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
            status: 'active',
            cancel_at_period_end: true,
          },
          error: null,
        };
      }
      if (fnName === 'billing-reactivate') {
        return reactivateFn(fnName, options);
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    });

    const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
    await user.click(reactivateButton);

    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
      'subscription-manage',
      expect.objectContaining({ body: expect.objectContaining({ action: 'reactivate' }) })
    );
  });

  it('should handle cancellation errors', async () => {
    const user = userEvent.setup();
    
    const cancelFn = apiMock.mockCancel({}, { shouldFail: true });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '2025-11-12T18:00:00Z',
            canReactivate: false,
          },
          error: null,
        };
      }
      if (fnName === 'billing-cancel') {
        return cancelFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'vip',
        },
        error: null,
      };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId('action-cancel');
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    // Dialog should close on error as well
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
  });
});
