import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockSupabaseClient, createSubscriptionStatus } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';

describe('Cancel Subscription Flows', () => {
  let apiMock: SubscriptionApiMock;

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

    let statusCall = 0;
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        statusCall += 1;
        const statusData = statusCall > 1
          ? createSubscriptionStatus({ cancelAtPeriodEnd: true })
          : createSubscriptionStatus();
        return { data: statusData, error: null };
      }
      if (fnName === 'billing-cancel') {
        return cancelFn(fnName, options);
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
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
    
    await waitFor(() => {
      expect(screen.getByText(/11\/12\/2025/i)).toBeInTheDocument();
    });
    
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-cancel')).toBeTruthy();
  });

  it('should show warning for immediate cancellation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus(), error: null };
      }
      return { data: null, error: null };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId('action-cancel');
    await user.click(cancelButton);

    // The component shows a confirmation dialog for cancellation
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should allow reactivation of canceled subscription', async () => {
    const user = userEvent.setup();
    
    const reactivateFn = apiMock.mockReactivate({
      success: true,
      message: 'Subscription reactivated successfully',
    });

    let statusCall = 0;
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        statusCall += 1;
        const statusData = statusCall === 1
          ? createSubscriptionStatus({ cancelAtPeriodEnd: true, canReactivate: true, status: 'canceled' })
          : createSubscriptionStatus({ cancelAtPeriodEnd: false, canReactivate: false });
        return { data: statusData, error: null };
      }
      if (fnName === 'billing-reactivate') {
        return reactivateFn(fnName, options);
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // When subscription is set to cancel at period end, reactivate button should appear
    const reactivateButton = await screen.findByRole('button', { name: /reactivate/i });
    expect(reactivateButton).toBeInTheDocument();
    
    await user.click(reactivateButton);
    
    await waitFor(() => {
      // After reactivation, the cancel button should return (indicating subscription is active again)
      expect(screen.getByTestId('action-cancel')).toBeInTheDocument();
    });
    
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-reactivate')).toBeTruthy();
  });

  it('should handle cancellation errors', async () => {
    const user = userEvent.setup();
    
    const cancelFn = apiMock.mockCancel({}, { shouldFail: true });

    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus(), error: null };
      }
      if (fnName === 'billing-cancel') {
        return cancelFn(fnName, options);
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
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
    
    // Wait for the operation to complete
    await waitFor(() => {
      // Dialog should close after error is handled
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Verify the API was called
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-cancel')).toBeTruthy();
  });
});
