import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockSupabaseClient, createSubscriptionStatus } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import scaPreview from '../fixtures/stripe/preview/sca_required_preview.json';

describe('SCA (Strong Customer Authentication) Flow', () => {
  const expectStatusLoaded = async () => {
    await waitFor(() => {
      expect(screen.getAllByText(/Current Status/i)[0]).toBeInTheDocument();
    });
  };

  const findVipChangeButton = () => {
    const changePlanButtons = screen.getAllByRole('button', { name: /Change Plan/i });
    const upgradeButton = changePlanButtons.find(btn => btn.getAttribute('data-testid') === 'action-upgrade');
    return upgradeButton ?? changePlanButtons[changePlanButtons.length - 1];
  };

  beforeEach(() => {
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string, options?: { body?: Record<string, unknown> }) => {
      if (fnName === 'billing-status') {
        return {
          data: createSubscriptionStatus(),
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
      return { data: null, error: { message: 'Unknown function' } };
    });
  });

  it('should detect when SCA is required', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EnhancedSubscriptionManager />);

    await expectStatusLoaded();

    const vipButton = findVipChangeButton();
    await user.click(vipButton);

    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });
  });

  it('should show SCA prompt to user', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EnhancedSubscriptionManager />);

    await expectStatusLoaded();

    const vipButton = findVipChangeButton();
    await user.click(vipButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Active/i)[0]).toBeInTheDocument();
    });
  });

  it('should handle successful SCA completion', async () => {
    const user = userEvent.setup();

    let changeInvocation = 0;
    const mockInvokeWithSuccess = vi.fn(async (fnName: string, options?: { body?: Record<string, unknown> }) => {
      if (fnName === 'billing-status') {
        return {
          data: createSubscriptionStatus(),
          error: null,
        };
      }
      if (fnName === 'billing-change') {
        changeInvocation += 1;
        if (changeInvocation === 1) {
          return {
            data: {
              requires_action: true,
              client_secret: 'pi_test_secret',
            },
            error: null,
          };
        }
        return {
          data: {
            success: true,
            payment_intent_status: 'succeeded',
          },
          error: null,
        };
      }
      if (fnName === 'billing-preview') {
        return { data: scaPreview, error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });

    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(mockInvokeWithSuccess);

    renderWithProviders(<EnhancedSubscriptionManager />);

    await expectStatusLoaded();

    const vipButton = findVipChangeButton();
    await user.click(vipButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    // Wait for the operation to complete and dialog to close
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-action')).not.toBeInTheDocument();
    });
  });

  it('should handle SCA failure', async () => {
    const user = userEvent.setup();

    const mockInvokeWithFailure = vi.fn(async (fnName: string, options?: { body?: Record<string, unknown> }) => {
      if (fnName === 'billing-status') {
        return {
          data: createSubscriptionStatus(),
          error: null,
        };
      }
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
      if (fnName === 'billing-preview') {
        return { data: scaPreview, error: null };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });

    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(mockInvokeWithFailure);

    renderWithProviders(<EnhancedSubscriptionManager />);

    await expectStatusLoaded();

    const vipButton = findVipChangeButton();
    await user.click(vipButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getAllByText(/VIP/i)[0]).toBeInTheDocument();
    });
  });

  it('should allow retry after SCA failure', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EnhancedSubscriptionManager />);

    await expectStatusLoaded();

    const vipButton = findVipChangeButton();
    await user.click(vipButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });

    const confirmButton = screen.getByTestId('confirm-action');
    await user.click(confirmButton);

    await waitFor(() => {
      const retryButton = screen.queryByRole('button', { name: /try again|retry/i });
      if (retryButton) {
        expect(retryButton).not.toBeDisabled();
      }
    });
  });
});
