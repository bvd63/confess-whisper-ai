import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import { ConfirmProvider } from '../../src/contexts/ConfirmContext';
import { vi } from 'vitest';

// Type for chainable Supabase query mock
type ChainableMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  containedBy: ReturnType<typeof vi.fn>;
  rangeLt: ReturnType<typeof vi.fn>;
  rangeGt: ReturnType<typeof vi.fn>;
  rangeGte: ReturnType<typeof vi.fn>;
  rangeLte: ReturnType<typeof vi.fn>;
  rangeAdjacent: ReturnType<typeof vi.fn>;
  overlaps: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

// Complete Supabase mock for subscription tests
const createSupabaseTestUtilsMock = () => {
  const mockFunctionsInvoke = vi.fn(async (name: string) => {
    if (name === 'ai-moderation') {
      return { data: { is_safe: true }, error: null };
    }

    if (name === 'create-confession') {
      return {
        data: {
          confession: {
            id: 'test-confession',
            content: 'safe confession',
            category: 'other',
            created_at: new Date().toISOString(),
          },
          rateLimit: null,
        },
        error: null,
      };
    }

    if (name === 'report-confession') {
      return {
        data: {
          success: true,
          messageKey: 'report.success',
        },
        error: null,
      };
    }

    if (name.startsWith('enhanced-auth')) {
      const params = name.split('?')[1] ?? '';
      const searchParams = new URLSearchParams(params);
      const action = searchParams.get('action');

      switch (action) {
        case 'list-sessions':
          return {
            data: {
              sessions: [],
            },
            error: null,
          };
        case 'refresh-session':
          return {
            data: {
              refreshToken: 'mock-refresh-token-2',
              expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
              stayConnected: false,
              sessionId: 'session-mock',
            },
            error: null,
          };
        case 'revoke-session':
          return {
            data: {
              success: true,
              messageKey: 'auth.session_revoked',
            },
            error: null,
          };
        case 'revoke-all-sessions':
          return {
            data: {
              success: true,
              messageKey: 'auth.all_sessions_revoked',
            },
            error: null,
          };
        case 'enhanced-login':
          return {
            data: {
              user: {
                id: 'test-user',
                email: 'test@example.com',
              },
              session: {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
              },
              refreshToken: 'mock-refresh-token',
              expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
              stayConnected: false,
            },
            error: null,
          };
        case 'check-captcha-required':
          return {
            data: {
              required: false,
            },
            error: null,
          };
        default:
          return { data: null, error: null };
      }
    }

    return { data: null, error: null };
  });
  
  // Create mock result object
  const mockResult = {
    data: {
      id: 'test-subscription',
      status: 'VIP',
      current_period_end: '2025-11-12T18:00:00Z',
      plan_name: 'vip',
      is_premium: false,
      subscription_tier: 'vip',
      subscription_ends_at: '2025-11-12T18:00:00Z',
      trial_active: false,
      trial_end_date: null,
      trial_premium_used: false,
      subscription_status: 'active'
    },
    error: null
  };
  
  // Create chainable mock - each method returns an object with all methods
  const createChainableMock = (): ChainableMock => {
    const chain: ChainableMock = {
      select: vi.fn(() => createChainableMock()),
      eq: vi.fn(() => createChainableMock()),
      neq: vi.fn(() => createChainableMock()),
      gt: vi.fn(() => createChainableMock()),
      gte: vi.fn(() => createChainableMock()),
      lt: vi.fn(() => createChainableMock()),
      lte: vi.fn(() => createChainableMock()),
      like: vi.fn(() => createChainableMock()),
      ilike: vi.fn(() => createChainableMock()),
      is: vi.fn(() => createChainableMock()),
      in: vi.fn(() => createChainableMock()),
      contains: vi.fn(() => createChainableMock()),
      containedBy: vi.fn(() => createChainableMock()),
      rangeLt: vi.fn(() => createChainableMock()),
      rangeGt: vi.fn(() => createChainableMock()),
      rangeGte: vi.fn(() => createChainableMock()),
      rangeLte: vi.fn(() => createChainableMock()),
      rangeAdjacent: vi.fn(() => createChainableMock()),
      overlaps: vi.fn(() => createChainableMock()),
      order: vi.fn(() => createChainableMock()),
      limit: vi.fn(() => createChainableMock()),
      range: vi.fn(() => createChainableMock()),
      single: vi.fn().mockResolvedValue(mockResult),
      maybeSingle: vi.fn().mockResolvedValue(mockResult),
      then: vi.fn((resolve) => Promise.resolve(mockResult).then(resolve)),
    };
    return chain;
  };
  
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-user' }, access_token: 'mock-access-token' } },
          error: null
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null
        }),
        setSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' } },
          error: null
        }),
        signOut: vi.fn().mockResolvedValue({
          error: null
        }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        }))
      },
      from: vi.fn(() => ({
        ...createChainableMock(),
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        update: vi.fn(() => createChainableMock()),
        delete: vi.fn(() => createChainableMock()),
        upsert: vi.fn(() => createChainableMock()),
      })),
    functions: {
      invoke: mockFunctionsInvoke
    },
    storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
        }))
      },
    channel: vi.fn(() => ({
      on: vi.fn(function(this: unknown) { return this; }),
      subscribe: vi.fn(() => ({
        unsubscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  };
};

const supabaseTestUtilsMock = createSupabaseTestUtilsMock();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseTestUtilsMock,
}));

vi.mock('@/integrations/supabase/safeClient', () => ({
  getSupabaseClient: vi.fn(async () => supabaseTestUtilsMock),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface AllTheProvidersProps {
  children: ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
