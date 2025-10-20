import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock, createMockSupabase } from '../helpers/apiMock';
import downgradePreview from '../fixtures/stripe/preview/downgrade_vip_to_premium_period_end.json';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
}));

describe('Downgrade at Period End Flow', () => {
  let apiMock: SubscriptionApiMock;
  let mockSupabase: any;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    
    const scheduleChangeFn = apiMock.mockScheduleChange({
      success: true,
      message: 'Downgrade scheduled for end of billing period',
      effective_date: '2025-11-12T18:00:00Z',
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
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

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
  });

  it('should schedule downgrade for period end', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    // Click on Premium plan to downgrade
    const premiumChangeButton = screen.getByRole('button', { name: /change.*premium/i });
    await user.click(premiumChangeButton);
    
    // Should show effective date
    await waitFor(() => {
      expect(screen.getByText(/november.*12.*2025/i)).toBeInTheDocument();
    });
  });

  it('should display exact period end date in local timezone', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const premiumChangeButton = screen.getByRole('button', { name: /change.*premium/i });
    await user.click(premiumChangeButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Should show success toast with date
    await waitFor(() => {
      expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
      expect(screen.getByText(/november.*12/i)).toBeInTheDocument();
    });
  });

  it('should show pending change status on re-open', async () => {
    const user = userEvent.setup();
    
    // Mock with pending change
    const mockInvokeWithPending = vi.fn(async (fnName: string) => {
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

    const pendingSupabase = createMockSupabase(mockInvokeWithPending);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: pendingSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/pending.*change/i)).toBeInTheDocument();
    });
  });

  it('should prevent conflicting changes when downgrade is pending', async () => {
    const user = userEvent.setup();
    
    const mockInvokeWithPending = vi.fn(async (fnName: string) => {
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

    const pendingSupabase = createMockSupabase(mockInvokeWithPending);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: pendingSupabase,
    }));
    
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
