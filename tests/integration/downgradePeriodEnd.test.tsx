import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockSupabaseClient, createSubscriptionStatus } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';

describe('Downgrade Flow', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
  });

  it('should open downgrade confirmation dialog', async () => {
    const user = userEvent.setup();

    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus({ currentPlan: 'vip' }), error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });

    const downgradeButton = await screen.findByTestId('action-free');
    expect(downgradeButton).toBeInTheDocument();
    await user.click(downgradeButton!);
    
    await waitFor(() => {
      expect(screen.getByText(/You are about to change to Free/i)).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should prevent downgrade to Free (use cancel instead)', async () => {
    const user = userEvent.setup();

    const changeFn = apiMock.mockChange({
      success: true,
      message: 'Downgrade scheduled successfully',
    });

    let statusCall = 0;
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options: any) => {
      if (fnName === 'billing-status') {
        statusCall += 1;
        const status = statusCall === 1
          ? createSubscriptionStatus({ currentPlan: 'vip' })
          : createSubscriptionStatus({ currentPlan: 'free' });
        return { data: status, error: null };
      }
      if (fnName === 'billing-preview') {
        return {
          data: {
            preview: {
              amountDue: 0,
              currency: 'usd',
              prorationAmount: 0,
              subtotal: 499,
              total: 0,
              periodEnd: 1731434400,
              lines: []
            }
          },
          error: null
        };
      }
      if (fnName === 'manage-subscription-v2' || fnName === 'billing-change') {
        apiMock.getRequestLog().push({ endpoint: 'billing-change', body: options?.body });
        const result = await changeFn(fnName, options);
        return result;
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });

    const downgradeButton = await screen.findByTestId('action-free');
    expect(downgradeButton).toBeInTheDocument();
    await user.click(downgradeButton!);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);
    
    // Dialog should close (downgrade to Free is prevented)
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
  });

  it('should show cancel notice when period end is scheduled', async () => {
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus({ currentPlan: 'vip', cancelAtPeriodEnd: true }), error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Ends:/i)).toBeInTheDocument();
      expect(screen.getByText(/11\/12\/2025/i)).toBeInTheDocument();
    });
  });

  it('should disable button for current plan', async () => {
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return { data: createSubscriptionStatus({ currentPlan: 'vip' }), error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const vipButtons = screen.getAllByRole('button', { name: /your plan/i });
    vipButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
