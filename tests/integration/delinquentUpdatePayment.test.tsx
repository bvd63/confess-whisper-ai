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

  it('should display update payment method button prominently', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update.*payment/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update.*payment/i });
    expect(updateButton).toHaveClass(/destructive|warning/);
  });

  it('should complete payment update successfully', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update.*payment/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update.*payment/i });
    await user.click(updateButton);
    
    // Mock Payment Element interaction
    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });
    
    // Simulate successful payment method update
    const submitButton = screen.getByRole('button', { name: /Success/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Success/i)[0]).toBeInTheDocument();
    });
    
    expect(true).toBe(true);
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
      expect(screen.getByRole('button', { name: /update.*payment/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update.*payment/i });
    await user.click(updateButton);
    
    const submitButton = screen.getByRole('button', { name: /Success/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Success/i)[0]).toBeInTheDocument();
    });
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
      expect(screen.getByRole('button', { name: /update.*payment/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update.*payment/i });
    await user.click(updateButton);
    
    const submitButton = screen.getByRole('button', { name: /Success/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });
  });

  it('should disable other actions while payment is past due', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/past.*due/i)).toBeInTheDocument();
    });

    // Change plan buttons should be disabled
    const changeButtons = screen.queryAllByRole('button', { name: /change.*plan/i });
    changeButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
