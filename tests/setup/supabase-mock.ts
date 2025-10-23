import { vi } from 'vitest';

// Mock persistence manager to return immediately in tests
vi.mock('@/lib/persistenceManager', () => ({
  persistenceManager: {
    getLanguage: vi.fn().mockResolvedValue('en'),
    saveLanguage: vi.fn().mockResolvedValue(undefined),
  }
}));

// Helper that creates a permissive, explicit chainable builder. This avoids
// Proxy/thenable edge-cases by returning an object with explicit chain methods
// used across the codebase. Terminal methods return predictable promises.
const createChainable = () => {
  const terminalResponse = async (result: any = null) => ({ data: result, error: null });

  const builder: any = {};

  // Common chainable methods used across the app. Each returns the builder
  // itself so calls can be chained: .select(...).eq(...).order(...)
  const chainMethods = [
    'select', 'eq', 'neq', 'is', 'in', 'order', 'limit', 'match', 'filter', 
    'returns', 'like', 'ilike', 'gte', 'lte', 'gt', 'lt', 'range', 'or', 
    'not', 'contains', 'containedBy', 'overlaps', 'textSearch'
  ];

  for (const m of chainMethods) {
    builder[m] = vi.fn((..._args: any[]) => builder);
  }

  // Terminal methods that should resolve to { data, error }
  builder.single = vi.fn(() => terminalResponse(null));
  builder.maybeSingle = vi.fn(() => terminalResponse(null));
  builder.insert = vi.fn((_payload?: any) => terminalResponse([]));
  builder.update = vi.fn((_payload?: any) => terminalResponse([]));
  builder.delete = vi.fn(() => terminalResponse([]));

  // Note: we intentionally do NOT add a `then` property here. Making the
  // builder thenable causes it to be treated as a Promise in some contexts
  // which can break chaining (calls like .select(...).eq(...).maybeSingle()).

  return builder as any;
};

// Build the shared supabase mock
export const supabaseMock = (() => {
  const chainable = createChainable();

  const realtimeSub = {
    on: vi.fn(() => realtimeSub),
    subscribe: vi.fn(async () => ({ data: null, error: null, subscription: { unsubscribe: vi.fn() } })),
    unsubscribe: vi.fn(),
  };

  return {
    from: vi.fn(() => createChainable()),
    auth: {
      getSession: vi.fn(async () => ({ 
        data: { 
          session: {
            user: { id: 'test-user', email: 'test@example.com' },
            access_token: 'test-token'
          } 
        }, 
        error: null 
      })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'test-user', email: 'test@example.com' } }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: null, error: null })),
      signOut: vi.fn(async () => ({ data: null, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null }))
    },
    channel: vi.fn(() => realtimeSub),
    // removeChannel is used to teardown realtime subscriptions
    removeChannel: vi.fn(() => ({})),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        download: vi.fn(async () => ({ data: new Blob(), error: null }))
      }))
    }
  } as any;
})();

// Also export it as mockSupabaseClient for compatibility
export const mockSupabaseClient = supabaseMock;

vi.mock('@/lib/supabaseClient', () => ({
  getSupabase: () => supabaseMock,
  __setSupabaseClientForTests: vi.fn(),
  __resetSupabaseClientForTests: vi.fn(),
}));

// Also mock the integrations/supabase/client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));
