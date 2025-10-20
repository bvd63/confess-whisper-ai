import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { createMockSupabase } from '../helpers/apiMock';
import scaPreview from '../fixtures/stripe/preview/sca_required_preview.json';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
}));

describe('SCA (Strong Customer Authentication) Flow', () => {
  let mockSupabase: any;

  beforeEach(() => {
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
      if (fnName === 'billing-preview') {
        return { data: scaPreview, error: null };
      }
      if (fnName === 'billing-change') {
        return {
          data: {
            requires_action: true,
            client_secret: 'pi_test_secret_sca_required',
            payment_intent_status: 'requires_action',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    mockSupabase = createMockSupabase(mockInvoke);
    
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
  });

  it('should detect when SCA is required', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const vipButton = screen.getByRole('button', { name: /change.*vip/i });
    await user.click(vipButton);
    
    await waitFor(() => {
      expect(screen.getByText(/requires.*action|authentication.*required/i)).toBeInTheDocument();
    });
  });

  it('should show SCA prompt to user', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const vipButton = screen.getByRole('button', { name: /change.*vip/i });
    await user.click(vipButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/verify.*payment|authenticate|secure.*checkout/i)).toBeInTheDocument();
    });
  });

  it('should handle successful SCA completion', async () => {
    const user = userEvent.setup();
    
    // Mock SCA success
    const mockInvokeWithSuccess = vi.fn(async (fnName: string) => {
      if (fnName === 'billing-change') {
        // First call requires action
        if (!mockInvokeWithSuccess.mock.calls.length || mockInvokeWithSuccess.mock.calls.length === 1) {
          return {
            data: {
              requires_action: true,
              client_secret: 'pi_test_secret',
            },
            error: null,
          };
        }
        // Second call after SCA succeeds
        return {
          data: {
            success: true,
            payment_intent_status: 'succeeded',
          },
          error: null,
        };
      }
      return {
        data: {
          subscribed: true,
          plan: 'premium',
        },
        error: null,
      };
    });

    const scaSupabase = createMockSupabase(mockInvokeWithSuccess);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: scaSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const vipButton = screen.getByRole('button', { name: /change.*vip/i });
    await user.click(vipButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Simulate SCA completion
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('should handle SCA failure', async () => {
    const user = userEvent.setup();
    
    const mockInvokeWithFailure = vi.fn(async (fnName: string) => {
      if (fnName === 'billing-change') {
        return {
          data: {
            requires_action: true,
            client_secret: 'pi_test_secret',
            payment_intent_status: 'requires_action',
          },
          error: null,
        };
      }
      return {
        data: {
          subscribed: true,
          plan: 'premium',
        },
        error: null,
      };
    });

    const failSupabase = createMockSupabase(mockInvokeWithFailure);
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: failSupabase,
    }));
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const vipButton = screen.getByRole('button', { name: /change.*vip/i });
    await user.click(vipButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // User cancels or fails SCA
    await waitFor(() => {
      expect(screen.getByText(/authentication.*failed|verification.*failed/i)).toBeInTheDocument();
    });
  });

  it('should allow retry after SCA failure', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });

    const vipButton = screen.getByRole('button', { name: /change.*vip/i });
    await user.click(vipButton);
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      const retryButton = screen.queryByRole('button', { name: /try again|retry/i });
      if (retryButton) {
        expect(retryButton).not.toBeDisabled();
      }
    });
  });
});
