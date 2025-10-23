import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../helpers/testUtils';
import Performance from '@/pages/admin/Performance';

// Mock LanguageContext with all exports
vi.mock('@/contexts/LanguageContext', async () => {
  const actual = await vi.importActual('@/contexts/LanguageContext');
  return {
    ...actual,
    useLanguage: () => ({
      t: {
        admin_performance: 'Performance Dashboard',
        admin_performance_desc: 'System Overview',
        admin_active_users: 'Active Users',
        admin_last_5_minutes: 'Last 5 minutes',
        admin_cache: 'Cache Management',
        admin_clear_cache: 'Clear Cache',
        admin_clear_warning: 'This will clear all cached data',
        admin_confirm_clear: 'Confirm Clear',
        common_cancel: 'Cancel',
        common_confirm: 'Confirm',
        cache_cleared: 'Cache cleared successfully',
      },
      language: 'en',
      setLanguage: vi.fn(),
    }),
  };
});

// Mock hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'test-user' },
    session: { access_token: 'test-token' },
    isLoading: false,
  }),
}));

describe('Performance Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders performance dashboard with metrics', async () => {
    renderWithProviders(<Performance />);

    await waitFor(() => {
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    });
  });

  it('displays system overview section', async () => {
    renderWithProviders(<Performance />);

    await waitFor(() => {
      expect(screen.getByText(/System Overview|performance_overview/)).toBeInTheDocument();
    });
  });

  it('shows performance metrics cards', async () => {
    renderWithProviders(<Performance />);

    await waitFor(() => {
      // Should display various metric cards
      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
