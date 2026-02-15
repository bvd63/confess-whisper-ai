import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { extractBearerToken, isInternalSecretValid } from "./security.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature",
};

export const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

export interface AuthenticatedRequestContext {
  userId: string;
  email: string | null;
  token: string;
}

export const getAuthenticatedRequestContext = async (
  req: Request,
): Promise<{ ok: true; context: AuthenticatedRequestContext } | { ok: false; response: Response }> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, response: jsonResponse({ error: "CONFIGURATION_ERROR" }, 500) };
  }

  const token = extractBearerToken(req.headers.get("Authorization"));
  if (!token) {
    return { ok: false, response: jsonResponse({ error: "UNAUTHORIZED" }, 401) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: jsonResponse({ error: "UNAUTHORIZED" }, 401) };
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      email: user.email ?? null,
      token,
    },
  };
};

export const requireInternalSecret = (req: Request): { ok: true } | { ok: false; response: Response } => {
  const internalSecret = Deno.env.get("INTERNAL_JOB_SECRET");
  const providedSecret = req.headers.get("x-internal-secret");

  if (!isInternalSecretValid(providedSecret, internalSecret)) {
    return { ok: false, response: jsonResponse({ error: "FORBIDDEN_INTERNAL" }, 403) };
  }

  return { ok: true };
};
