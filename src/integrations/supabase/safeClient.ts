import type { Database } from './types';
import { env } from '@/lib/env';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient<Database> | null = null;
let clientPromise: Promise<SupabaseClient<Database>> | null = null;

const getStorage = () => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
};

export const getSupabaseClient = async () => {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return createClient<Database>(env.client.supabaseUrl, env.client.supabaseAnonKey, {
        auth: {
          storage: getStorage(),
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    })();
  }

  client = await clientPromise;
  return client;
};
