import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dompurify to avoid resolution and DOM-specific issues in tests
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string, _config?: unknown) => html,
  },
}));

// Global Supabase client mock for integration tests
vi.mock('@/integrations/supabase/client', () => {
  const mkResolved = (extra: any = {}) => Promise.resolve({ data: null, error: null, ...extra });

  const invoke = vi.fn(async (_fn: string, _opts?: any) => ({ data: null, error: null }));

  const makeProfilesSelect = () => ({
    // Handle count queries with head:true
    gte: vi.fn(async () => ({ count: 0, data: null, error: null })),
    eq: vi.fn(() => ({ maybeSingle: vi.fn(() => mkResolved()), single: vi.fn(() => mkResolved()) })),
    maybeSingle: vi.fn(() => mkResolved()),
    single: vi.fn(() => mkResolved()),
  });

  return {
    supabase: {
      functions: { invoke },
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'test-user', email: 'test@example.com', user_metadata: {} } }, error: null })),
        getSession: vi.fn(async () => ({ data: { session: { user: { id: 'test-user' } } }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn((table: string) => {
        // Minimal handling tailored to tests
        if (table === 'profiles') {
          return {
            select: vi.fn((_cols?: any, _opts?: any) => makeProfilesSelect()),
          } as any;
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(() => mkResolved()), single: vi.fn(() => mkResolved()) })),
            maybeSingle: vi.fn(() => mkResolved()),
            single: vi.fn(() => mkResolved()),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => mkResolved()) })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => mkResolved()) })) })) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => mkResolved()) })),
          gte: vi.fn(async () => ({ count: 0, data: null, error: null })),
        } as any;
      }),
      channel: vi.fn(() => ({ on: vi.fn(function (this: any) { return this; }), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
      removeChannel: vi.fn(),
    }
  };
});

// Mock supabase client singleton used by hooks
vi.mock('@/lib/supabaseClient', () => {
  const invoke = vi.fn(async (_fn: string, _opts?: any) => ({ data: null, error: null }));
  const auth = {
    getUser: vi.fn(async () => ({ data: { user: { id: 'test-user', email: 'test@example.com' } }, error: null })),
    getSession: vi.fn(async () => ({ data: { session: { user: { id: 'test-user', email: 'test@example.com' } } }, error: null })),
  };
  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
  }));
  const supabase = { functions: { invoke }, auth, from } as any;
  return {
    getSupabase: () => supabase,
    __setSupabaseClientForTests: vi.fn(),
    __resetSupabaseClientForTests: vi.fn(),
  };
});

// Mock persistence manager to avoid indexedDB issues
vi.mock('@/lib/persistenceManager', () => ({
  persistenceManager: {
    getLanguage: vi.fn(async () => {
      try {
        const val = localStorage.getItem('language');
        return val ?? 'en';
      } catch {
        return 'en';
      }
    }),
    saveLanguage: vi.fn(async (lang: string) => {
      try { localStorage.setItem('language', lang); } catch {}
      return undefined as unknown as void;
    }),
    getPreference: vi.fn().mockResolvedValue(null),
    setPreference: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock localStorage with in-memory store
const __store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => (__store[key] ?? null)),
  setItem: vi.fn((key: string, value: string) => { __store[key] = String(value); }),
  removeItem: vi.fn((key: string) => { delete __store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(__store)) delete (__store as any)[k]; }),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock indexedDB
const indexedDBMock = {
  open: vi.fn(() => ({
    result: {
      objectStoreNames: { contains: vi.fn(() => false) },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: null })),
          put: vi.fn(() => ({ onsuccess: null })),
          delete: vi.fn(() => ({ onsuccess: null })),
          clear: vi.fn(() => ({ onsuccess: null })),
          getAll: vi.fn(() => ({ onsuccess: null })),
        })),
      })),
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
  deleteDatabase: vi.fn(),
};
(global as unknown as { indexedDB: typeof indexedDBMock }).indexedDB = indexedDBMock;

// Suppress console errors in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
