import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _instance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_instance) return _instance;

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  _instance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? (localStorage as any) : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
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
