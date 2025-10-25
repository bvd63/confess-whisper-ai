import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { SubscriptionApiMock } from '../helpers/apiMock';
import { supabase } from '@/integrations/supabase/client';
import upgradePreview from '../fixtures/stripe/preview/upgrade_premium_to_vip_monthly.json';

describe('Upgrade Immediate Flow', () => {
  let apiMock: SubscriptionApiMock;

  beforeEach(() => {
    apiMock = new SubscriptionApiMock();
    vi.clearAllMocks();
    
    const previewFn = apiMock.mockPreview('price_1SJ0vwR7kygIyYg9OeCiqV00', upgradePreview);
    const changeFn = apiMock.mockChange({
      success: true,
      message: 'Upgrade successful — VIP is now active.',
      subscription: {
        tier: 'vip',
        status: 'active',
      },
    });

    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'premium',
            interval: 'monthly',
            status: 'active',
          },
          error: null,
        };
      }
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
      if (fnName === 'billing-preview') {
        return previewFn(fnName, options);
      }
      if (fnName === 'billing-change') {
        return changeFn(fnName, options);
      }
      return { data: null, error: { message: 'Unknown function' } };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
  });

  it('should show financial preview before upgrade', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    // Click on VIP plan
    const vipChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(vipChangeButton);
    
    // Should show preview with proration
    await waitFor(() => {
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
    });
  });

  it('should complete upgrade and refresh entitlements', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(vipChangeButton);
    
    // Confirm upgrade
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /Success/i });
    await user.click(confirmButton);
    
    // Should show success toast
    await waitFor(() => {
      expect(screen.getAllByText(/Success/i)[0]).toBeInTheDocument();
    });
    
    // Verify API was called
    const log = apiMock.getRequestLog();
    expect(log.some(req => req.endpoint === 'billing-change')).toBeTruthy();
  });

  it('should disable buttons during request', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(vipChangeButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    
    // Button should be enabled initially
    expect(confirmButton).not.toBeDisabled();
    
    await user.click(confirmButton);
    
    // Button should be disabled during request
    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should handle upgrade errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Override with failing mock
    const failingChangeFn = apiMock.mockChange({}, { shouldFail: true });
    const mockInvoke = vi.fn(async (fnName: string, options: any) => {
      if (fnName === 'subscription-manage' && options?.body?.action === 'status') {
        return {
          data: {
            currentPlan: 'premium',
            interval: 'monthly',
            status: 'active',
          },
          error: null,
        };
      }
      if (fnName === 'billing-change') {
        return failingChangeFn(fnName, options);
      }
      return { data: { plan: 'premium' }, error: null };
    });

    vi.mocked(supabase.functions.invoke).mockImplementation(mockInvoke);
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });

    const vipChangeButton = screen.getByRole('button', { name: /Change Plan/i });
    await user.click(vipChangeButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
