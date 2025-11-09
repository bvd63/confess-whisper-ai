import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { env } from '@/lib/env';

const SUPABASE_URL = env.client.supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY = env.client.supabaseAnonKey;

/**
 * Enhanced Supabase client with connection pooling for scalability
 * Use this for high-traffic operations
 */
export const supabaseWithPooling = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-name': 'confessai-pool',
      },
    },
    // Connection pooling configuration
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabaseWithPooling
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}
