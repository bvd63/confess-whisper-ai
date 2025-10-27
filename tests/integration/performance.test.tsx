import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Performance from '@/pages/admin/Performance';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      admin_performance: 'Performance Dashboard',
      admin_performance_desc: 'System Overview',
      admin_active_users: 'Active Users',
      admin_last_5_minutes: 'Last 5 minutes',
      admin_cache: 'Cache Statistics',
      admin_clear_warning: 'This will clear cache',
      admin_clear_cache: 'Clear Cache',
      admin_confirm_clear: 'Confirm clear',
      common_cancel: 'Cancel',
      common_confirm: 'Confirm',
    },
  }),
}));

// Mock hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'test-user' },
    session: { access_token: 'test-token' },
    isLoading: false,
  }),
}));

describe('Performance Dashboard Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('renders performance dashboard with metrics', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Performance />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    });
  });

  it('displays system overview section', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Performance />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('System Overview')).toBeInTheDocument();
    });
  });

  it('shows performance metrics cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Performance />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should display various metric cards
      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
