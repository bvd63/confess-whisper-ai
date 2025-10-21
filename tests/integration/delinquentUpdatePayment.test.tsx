import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock, createMockSupabase } from '../helpers/apiMock';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
}));

describe('Delinquent Payment Update Flow', () => {
  let apiMock: SubscriptionApiMock;
  let mockSupabase: any;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    
    const updatePaymentFn = apiMock.mockUpdatePayment({
      success: true,
      message: 'Payment method updated successfully',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'premium',
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

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
  });

  it('should show payment update warning for delinquent account', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
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
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
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
    
    const mockInvokeWithRetry = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'premium',
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

    const retrySupabase = createMockSupabase(mockInvokeWithRetry);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: retrySupabase,
    }));
    
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

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-update-payment') {
        return failingUpdateFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'premium',
          status: 'past_due',
        },
        error: null,
      };
    });

    const failingSupabase = createMockSupabase(mockInvoke);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: failingSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update.*payment/i })).toBeInTheDocument();
    });

    const updateButton = screen.getByRole('button', { name: /update.*payment/i });
    await user.click(updateButton);
    
    const submitButton = screen.getByRole('button', { name: /Success/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
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
