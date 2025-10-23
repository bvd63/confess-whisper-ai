import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { vi } from 'vitest';
import { mockSupabaseClient } from '../setup/supabase-mock';

// Mock Supabase at the module level with a default implementation
// Individual tests can override the functions.invoke mock via vi.mocked()
export interface SubscriptionStatusMock {
  currentPlan: string;
  interval: 'monthly' | 'yearly' | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  canReactivate: boolean;
  priceId?: string;
  [key: string]: any;
}

export const createSubscriptionStatus = (overrides: Partial<SubscriptionStatusMock> = {}): SubscriptionStatusMock => ({
  currentPlan: 'vip',
  interval: 'monthly',
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: '2025-11-12T18:00:00Z',
  canReactivate: false,
  ...overrides,
});

export { mockSupabaseClient };

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  const testQueryClient = createTestQueryClient();
  return (
    <BrowserRouter>
      <QueryClientProvider client={testQueryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as renderWithProviders };
