import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let _instance: SupabaseClient | null = null;

function extractProjectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

function assertSupabaseProjectConfig(url: string) {
  if (!env.isDev) return;

  const expectedProjectRef = env.client.supabaseProjectId?.trim();
  if (!expectedProjectRef) return;

  const actualProjectRef = extractProjectRefFromUrl(url);
  if (!actualProjectRef) {
    throw new Error('[Supabase config] Invalid VITE_SUPABASE_URL; cannot extract project ref.');
  }

  if (actualProjectRef !== expectedProjectRef) {
    throw new Error(
      `[Supabase config] Project ref mismatch: VITE_SUPABASE_PROJECT_ID="${expectedProjectRef}" but URL ref is "${actualProjectRef}" in VITE_SUPABASE_URL="${url}".`
    );
  }
}

// Connection pool and rate limiting configuration
const supabaseOptions = {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-connection-pool': 'true',
    },
  },
  // Realtime configuration with rate limiting
  realtime: {
    params: {
      eventsPerSecond: 10,  // Rate limit realtime updates
    },
  },
} as const;

export function getSupabase(): SupabaseClient {
  if (_instance) return _instance;

  const SUPABASE_URL = env.client.supabaseUrl;
  const SUPABASE_PUBLISHABLE_KEY = env.client.supabaseAnonKey;

  assertSupabaseProjectConfig(SUPABASE_URL);

  _instance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: supabaseOptions.auth,
    db: supabaseOptions.db,
    global: supabaseOptions.global,
    realtime: supabaseOptions.realtime,
  });

  return _instance;
}

// Test helpers (tests will usually mock the module entirely)
export function __setSupabaseClientForTests(client: SupabaseClient | null) {
  _instance = client;
}

export function __resetSupabaseClientForTests() {
  _instance = null;
}
