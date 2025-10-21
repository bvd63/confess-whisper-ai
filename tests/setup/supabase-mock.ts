import { vi } from 'vitest';

// Mock persistence manager to return immediately in tests
vi.mock('@/lib/persistenceManager', () => ({
  persistenceManager: {
    getLanguage: vi.fn().mockResolvedValue('en'),
    saveLanguage: vi.fn().mockResolvedValue(undefined),
  }
}));

// Create a single shared mock that will be used everywhere
export const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    })),
    insert: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  })),
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
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({ data: {}, error: null })),
      download: vi.fn(async () => ({ data: new Blob(), error: null }))
    }))
  }
} as any;

// Also export it as mockSupabaseClient for compatibility
export const mockSupabaseClient = supabaseMock;

vi.mock('@/lib/supabaseClient', () => ({
  getSupabase: () => supabaseMock,
  __setSupabaseClientForTests: vi.fn(),
  __resetSupabaseClientForTests: vi.fn(),
}));
