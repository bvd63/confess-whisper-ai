import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';

type InvokeOptions = { body?: { action?: string; priceId?: string } };
import downgradePreview from '../fixtures/stripe/preview/downgrade_vip_to_premium_period_end.json';

describe('Downgrade at Period End Flow', () => {
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

    // Click on Premium plan to downgrade
    const premiumChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(premiumChangeButton);
    
    // Should show effective date
    await waitFor(() => {
      expect(screen.getByText(/11\/12\/2025/i)).toBeInTheDocument();
    });
  });

  it('should display exact period end date in local timezone', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const premiumChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(premiumChangeButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Should show success toast with date
    await waitFor(() => {
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/11\/12\/2025/i)).toBeInTheDocument();
    });
  });

  it('should show pending change status on re-open', async () => {
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
            pending_change: {
              target_tier: 'premium',
              effective_date: '2025-11-12T18:00:00Z',
            },
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
            pending_change: {
              target_tier: 'premium',
              effective_date: '2025-11-12T18:00:00Z',
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvokeWithPending);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/pending.*change/i)).toBeInTheDocument();
    });
  });

  it('should prevent conflicting changes when downgrade is pending', async () => {
    const user = userEvent.setup();
    
    const mockInvokeWithPending = vi.fn(async (fnName: string, options?: any) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'vip',
            interval: 'monthly',
            status: 'active',
            pending_change: {
              target_tier: 'premium',
              effective_date: '2025-11-12T18:00:00Z',
            },
          },
          error: null,
        };
      }
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'vip',
            pending_change: {
              target_tier: 'premium',
              effective_date: '2025-11-12T18:00:00Z',
            },
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvokeWithPending);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    // Change buttons should be disabled
    const changeButtons = screen.getAllByRole('button', { name: /change/i });
    changeButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
