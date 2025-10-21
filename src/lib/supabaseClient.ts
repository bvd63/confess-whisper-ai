import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _c: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_c) return _c;
  _c = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  return _c;
}

export function __setSupabaseClientForTests(c: SupabaseClient | null) {
  _c = c;
}

export function __resetSupabaseClientForTests() {
  _c = null;
}
