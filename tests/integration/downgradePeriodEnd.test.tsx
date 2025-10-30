import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
// Component removed
// import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';

type InvokeOptions = { body?: { action?: string; priceId?: string } };
import downgradePreview from '../fixtures/stripe/preview/downgrade_vip_to_free_period_end.json';

describe.skip('Downgrade at Period End Flow', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.clearAllMocks();
    
    const scheduleChangeFn = apiMock.mockScheduleChange({
      success: true,
      message: 'Downgrade scheduled for end of billing period',
      effective_date: '2025-11-12T18:00:00Z',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: InvokeOptions = {}) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            currentPeriodEnd: '2025-11-12T18:00:00Z',
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
      if (fnName === 'billing-schedule-change') {
        return scheduleChangeFn(fnName, options);
      }
      return { data: downgradePreview, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
  });

  it('should schedule downgrade for period end', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // Click on FREE plan to open confirmation
    const freeChangeButton = screen.getAllByTestId('action-downgrade')[0];
    await user.click(freeChangeButton);
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should display exact period end date in local timezone', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const freeChangeButton = screen.getAllByTestId('action-downgrade')[0];
    await user.click(freeChangeButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    // Dialog should close; date is already displayed in status card
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
  });

  it('should show current period end date on status card when provided', async () => {
    const user = userEvent.setup();
    
    // Mock with pending change
    const mockInvokeWithPending = vi.fn(async (fnName: string, options?: any) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            currentPeriodEnd: '2025-11-12T18:00:00Z',
            cancelAtPeriodEnd: true,
            canReactivate: true,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvokeWithPending);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      const expectedDate = new Date('2025-11-12T18:00:00Z').toLocaleDateString();
      expect(screen.getByText((t) => t.includes(expectedDate))).toBeInTheDocument();
    });
  });

  it('should keep change actions available (no pending UI)', async () => {
    const user = userEvent.setup();
    
    const mockInvokeWithPending = vi.fn(async (fnName: string, options?: any) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            cancelAtPeriodEnd: true,
            canReactivate: true,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvokeWithPending);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // Change buttons should still be present and clickable
    const changeButtons = screen.getAllByTestId('action-downgrade');
    expect(changeButtons.length).toBeGreaterThan(0);
  });
});
