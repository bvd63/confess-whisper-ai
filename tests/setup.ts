import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock dompurify with a basic, config-aware sanitizer for tests
vi.mock('dompurify', () => {
  type Config = {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: Record<string, string[]>;
    FORBID_TAGS?: string[];
    KEEP_CONTENT?: boolean;
  };

  const basicSanitize = (input: string, config: Config = {}) => {
    if (!input) return '';
    let out = String(input);

    // Remove dangerous tag blocks entirely
    out = out
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<(object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');

    // Remove inline event handlers
    out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // Neutralize dangerous protocols in href/src
    out = out.replace(/\s(href|src)\s*=\s*(['"]?)(javascript:|data:|vbscript:|file:)/gi, ' $1=$2');

    const allowedTags = Array.isArray(config.ALLOWED_TAGS) ? config.ALLOWED_TAGS.map(t => t.toLowerCase()) : undefined;
    const allowedAttr = config.ALLOWED_ATTR ?? {};

    if (allowedTags) {
      out = out.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tag, attrs) => {
        const isClosing = match.startsWith('</');
        const t = String(tag).toLowerCase();
        if (!allowedTags.includes(t)) {
          // Strip tag entirely; KEEP_CONTENT implied for opening tags via separate parsing
          return '';
        }
        // Keep only allowed attributes for this tag
        const permitted = new Set((allowedAttr[t] ?? []).map(a => a.toLowerCase()));
        if (isClosing) return `</${t}>`;
        if (permitted.size === 0) return `<${t}>`;

        const kept: string[] = [];
        const attrRegex = /([a-z0-9:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
        let m: RegExpExecArray | null;
        while ((m = attrRegex.exec(attrs)) !== null) {
          const name = m[1].toLowerCase();
          if (permitted.has(name)) {
            kept.push(` ${name}=${m[2]}`);
          }
        }
        return `<${t}${kept.join('')}>`;
      });
    }

    // Apply FORBID_TAGS removal (if any survived)
    const forbid = (config.FORBID_TAGS ?? []).map(t => t.toLowerCase());
    if (forbid.length) {
      const f = forbid.join('|');
      out = out.replace(new RegExp(`<\\s*(?:${f})(?:\\s[^>]*)?>`, 'gi'), '')
               .replace(new RegExp(`<\\/\\s*(?:${f})\\s*>`, 'gi'), '');
    }

    // If ALLOWED_TAGS is explicitly [], strip all tags
    if (Array.isArray(config.ALLOWED_TAGS) && config.ALLOWED_TAGS.length === 0) {
      out = out.replace(/<[^>]*>/g, '');
    }

    return out;
  };

  return {
    default: {
      sanitize: basicSanitize,
    },
  };
});

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
        if (table === 'public_profiles') {
          return {
            select: vi.fn((_cols?: any, _opts?: any) => ({
              gte: vi.fn(async () => ({ count: 0, data: null, error: null })),
            })),
          } as any;
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(() => mkResolved()), single: vi.fn(() => mkResolved()) })),
            maybeSingle: vi.fn(() => mkResolved()),
            single: vi.fn(() => mkResolved()),
            gte: vi.fn(async () => ({ count: 0, data: null, error: null })),
          })),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => mkResolved()) })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => mkResolved()) })) })) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => mkResolved()) })),
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
