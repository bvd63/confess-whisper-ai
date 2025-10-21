import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockSupabaseClient, createSubscriptionStatus } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';

describe('Trial Edge Cases', () => {
  beforeEach(() => {
    vi.mocked(mockSupabaseClient.functions.invoke).mockReset();
    vi.mocked(mockSupabaseClient.functions.invoke).mockImplementation(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return {
          data: createSubscriptionStatus({
            status: 'trialing',
            currentPeriodEnd: '2025-10-30T18:00:00Z',
            trial_active: true,
            trial_end_date: '2025-10-30T18:00:00Z',
          }),
          error: null,
        };
      }
      return { data: null, error: { message: 'Unknown function' } };
    });
  });

  it('should show trial status and end date', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    const expectedDate = new Date('2025-10-30T18:00:00Z').toLocaleDateString();
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expectedDate))).toBeInTheDocument();
    });
  });

  it('should allow cancel during trial', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId('action-cancel');
    expect(cancelButton).not.toBeDisabled();

    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should allow upgrade during trial', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    const upgradeButton = screen.getByTestId('action-upgrade');
    expect(upgradeButton).not.toBeDisabled();

    await user.click(upgradeButton);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-action')).toBeInTheDocument();
    });
  });

  it('should show current plan details during trial', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);

    await waitFor(() => {
      expect(screen.getAllByText(/Premium/i)[0]).toBeInTheDocument();
    });
  });
});
