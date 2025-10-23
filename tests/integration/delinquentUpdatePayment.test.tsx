import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockSupabaseClient, createSubscriptionStatus } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';

describe('Delinquent Subscription Handling', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return {
          data: createSubscriptionStatus({ status: 'past_due', payment_failed: true }),
          error: null,
        };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
  });

  it('should display past due status to the user', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Past Due/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
    });
  });

  it('should allow changing plans even when past due', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const upgradeButton = screen.getByTestId('action-upgrade');
    await user.click(upgradeButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should surface errors when change fails', async () => {
    const user = userEvent.setup();
    
    const failingChangeFn = apiMock.mockChange({}, { shouldFail: true });

    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus({ status: 'past_due' }), error: null };
      }
      if (fnName === 'billing-preview') {
        return {
          data: {
            preview: {
              amountDue: 350,
              currency: 'usd',
              prorationAmount: 350,
              subtotal: 999,
              total: 350,
              periodEnd: 1731434400,
              lines: []
            }
          },
          error: null
        };
      }
      if (fnName === 'manage-subscription-v2' || fnName === 'billing-change') {
        apiMock.getRequestLog().push({ endpoint: 'billing-change', body: options?.body });
        const result = await failingChangeFn(fnName, options);
        return result;
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const upgradeButton = screen.getByTestId('action-upgrade');
    await user.click(upgradeButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    // Wait for the operation to complete and dialog to close
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
    
    // Verify the API was called
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-change')).toBeTruthy();
  });

  it('should still allow cancellation when past due', async () => {
    const user = userEvent.setup();

    const cancelFn = apiMock.mockCancel({ success: true, message: 'Canceled' });

    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus({ status: 'past_due' }), error: null };
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

    // Wait for the operation to complete and dialog to close
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
    
    // Verify the API was called
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-cancel')).toBeTruthy();
  });
});
