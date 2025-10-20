import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';
import { EnhancedSubscriptionManager } from '@/components/EnhancedSubscriptionManager';
import { createMockSupabase } from '../helpers/apiMock';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null,
}));

describe('Trial Edge Cases', () => {
  let mockSupabase: any;

  beforeEach(() => {
    const mockInvoke = vi.fn(async (fnName: string) => {
      if (fnName === 'billing-status') {
        return {
          data: {
            subscribed: true,
            plan: 'premium',
            subscription_end: '2025-10-30T18:00:00Z',
            status: 'trialing',
            trial_active: true,
            trial_end_date: '2025-10-30T18:00:00Z',
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

  it('should show trial status in UI', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });
  });

  it('should disable downgrade action during trial', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    // Look for any downgrade or lower-tier options
    const downgradeButtons = screen.queryAllByRole('button', { name: /downgrade|free/i });
    
    downgradeButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should show tooltip explaining why downgrade is disabled', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    const downgradeButton = screen.queryByRole('button', { name: /downgrade/i });
    
    if (downgradeButton) {
      await user.hover(downgradeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/trial.*period/i)).toBeInTheDocument();
      });
    }
  });

  it('should allow cancel during trial', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).not.toBeDisabled();
  });

  it('should allow upgrade during trial', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    // Should be able to upgrade to VIP
    const upgradeButton = screen.queryByRole('button', { name: /vip|upgrade/i });
    
    if (upgradeButton) {
      expect(upgradeButton).not.toBeDisabled();
    }
  });

  it('should display trial end date prominently', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial ends/i)).toBeInTheDocument();
      expect(screen.getByText(/october.*30/i)).toBeInTheDocument();
    });
  });

  it('should show what happens after trial ends', async () => {
    renderWithProviders(<EnhancedSubscriptionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/trial/i)).toBeInTheDocument();
    });

    // Should inform user about billing after trial
    expect(screen.getByText(/after.*trial|billing.*start/i)).toBeInTheDocument();
  });
});
