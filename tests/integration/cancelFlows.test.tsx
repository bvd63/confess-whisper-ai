import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock, createMockSupabase } from '../helpers/apiMock';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
}));

describe('Cancel Subscription Flows', () => {
  let apiMock: SubscriptionApiMock;
  let mockSupabase: any;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
  });

  it('should cancel subscription at period end', async () => {
    const user = userEvent.setup();
    
    const cancelFn = apiMock.mockCancel({
      success: true,
      message: 'Subscription will be canceled at period end',
      cancel_at_period_end: true,
      ends_at: '2025-11-12T18:00:00Z',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'premium',
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

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    // Confirm cancellation
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Should show end date
    await waitFor(() => {
      expect(screen.getByText(/november.*12/i)).toBeInTheDocument();
      expect(screen.getByText(/period end/i)).toBeInTheDocument();
    });
    
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-cancel')).toBeTruthy();
  });

  it('should show warning for immediate cancellation', async () => {
    const user = userEvent.setup();
    
    const cancelNowFn = apiMock.mockCancel({
      success: true,
      message: 'Subscription canceled immediately',
      cancel_at_period_end: false,
      immediate: true,
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-cancel') {
        return cancelNowFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'premium',
        },
        error: null,
      };
    });

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel.*now/i });
    
    if (cancelButton) {
      await user.click(cancelButton);
      
      // Should show warning about immediate access loss
      await waitFor(() => {
        expect(screen.getByText(/warning|lose access/i)).toBeInTheDocument();
      });
    }
  });

  it('should allow reactivation of canceled subscription', async () => {
    const user = userEvent.setup();
    
    const reactivateFn = apiMock.mockReactivate({
      success: true,
      message: 'Subscription reactivated successfully',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'premium',
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

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/canceled/i)).toBeInTheDocument();
    });

    const reactivateButton = screen.getByRole('button', { name: /reactivate/i });
    await user.click(reactivateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/reactivated/i)).toBeInTheDocument();
    });
    
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-reactivate')).toBeTruthy();
  });

  it('should handle cancellation errors', async () => {
    const user = userEvent.setup();
    
    const cancelFn = apiMock.mockCancel({}, { shouldFail: true });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'billing-cancel') {
        return cancelFn(fnName, options);
      }
      return {
        data: {
          subscribed: true,
          plan: 'premium',
        },
        error: null,
      };
    });

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
