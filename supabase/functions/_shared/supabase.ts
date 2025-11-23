import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getServerEnv } from "./env.ts";

export type DatabaseClient = SupabaseClient<any>;

export const createServiceClient = (): DatabaseClient => {
  const env = getServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
};

export const createUserClient = (authHeader: string): DatabaseClient => {
  const env = getServerEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
};

export const requireAuth = async (authHeader: string | null) => {
  if (!authHeader) {
    return { user: null, error: "Missing Authorization header" } as const;
  }

  const supabase = createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Unauthorized" } as const;
  }

  return { user: data.user as User, client: supabase } as const;
};
