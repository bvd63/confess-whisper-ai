import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getAuthenticatedRequestContext, requireInternalSecret } from "../_shared/edge-auth.ts";
import {
  normalizeRateLimitRequest,
  type RateLimitIdentifier,
  type RateLimitConfig,
} from "./utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
  identifierType: "user" | "ip";
  error?: string;
}

const applyRateLimit = async (
  supabaseClient: any,
  action: string,
  identifier: RateLimitIdentifier,
  config: RateLimitConfig,
): Promise<RateLimitCheckResult> => {
  const key = `${action}:${identifier.value}`;
  const now = new Date();
  const fallbackResetAt = new Date(now.getTime() + config.windowMs).toISOString();

  const { data: existing, error: fetchError } = await supabaseClient
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (fetchError) {
    console.error('[rate-limit] Error fetching rate limit:', fetchError);
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: fallbackResetAt,
      identifierType: identifier.type,
      error: 'Rate limit check failed',
    };
  }

  if (existing && new Date(existing.reset_at) > now) {
    if (existing.count >= config.maxAttempts) {
      const retryAfter = Math.ceil((new Date(existing.reset_at).getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.reset_at,
        retryAfter,
        identifierType: identifier.type,
      };
    }

    const newCount = existing.count + 1;
    const { error: updateError } = await supabaseClient
      .from('rate_limits')
      .update({ count: newCount })
      .eq('key', key);

    if (updateError) {
      console.error('[rate-limit] Error updating rate limit:', updateError);
    }

    return {
      allowed: true,
      remaining: config.maxAttempts - newCount,
      resetAt: existing.reset_at,
      identifierType: identifier.type,
    };
  }

  const newResetAt = new Date(now.getTime() + config.windowMs).toISOString();
  const { error: upsertError } = await supabaseClient
    .from('rate_limits')
    .upsert({ key, count: 1, reset_at: newResetAt });

  if (upsertError) {
    console.error('[rate-limit] Error creating rate limit:', upsertError);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: newResetAt,
      identifierType: identifier.type,
      error: 'Rate limit creation failed',
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - 1,
    resetAt: newResetAt,
    identifierType: identifier.type,
  };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      console.warn('[rate-limit] Failed to parse request body', parseError);
      return new Response(
        JSON.stringify({ error: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalized = normalizeRateLimitRequest(rawBody);
    if (!normalized.ok) {
      return new Response(
        JSON.stringify({ error: normalized.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { action, identifiers: normalizedIdentifiers, config } = normalized.data;

    const authContext = await getAuthenticatedRequestContext(req);
    if (!authContext.ok) {
      const internal = requireInternalSecret(req);
      if (!internal.ok) {
        return internal.response;
      }
    }

    // Initialize Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    let identifiers: RateLimitIdentifier[];
    if (user?.id) {
      identifiers = [{ value: user.id, type: 'user' }];
    } else {
      const userIdentifier = normalizedIdentifiers.find((identifier) => identifier.type === 'user');
      const ipIdentifier = normalizedIdentifiers.find((identifier) => identifier.type === 'ip');
      if (!userIdentifier && !ipIdentifier) {
        return new Response(
          JSON.stringify({ error: 'MISSING_IDENTIFIER' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      identifiers = [userIdentifier ?? ipIdentifier!];
    }

    const checks: RateLimitCheckResult[] = [];
    for (const identifier of identifiers) {
      const result = await applyRateLimit(supabaseClient, action, identifier, config);
      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            allowed: false,
            remaining: 0,
            resetAt: result.resetAt,
            retryAfter: result.retryAfter,
            message: result.retryAfter
              ? `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
              : 'Rate limit exceeded.',
            identifierType: result.identifierType,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              ...(result.retryAfter
                ? {
                    'Retry-After': result.retryAfter.toString(),
                    'X-RateLimit-Limit': config.maxAttempts.toString(),
                    'X-RateLimit-Remaining': '0',
                  }
                : {}),
            },
          },
        );
      }
      checks.push(result);
    }

    const summary = checks.reduce<RateLimitCheckResult | null>((best, current) => {
      if (!best || current.remaining < best.remaining) {
        return current;
      }
      return best;
    }, null);

    const fallbackType = identifiers[0]?.type ?? 'ip';
    const responseBody: Record<string, unknown> = {
      allowed: true,
      remaining: summary?.remaining ?? config.maxAttempts,
      resetAt: summary?.resetAt ?? new Date(Date.now() + config.windowMs).toISOString(),
      identifierType: summary?.identifierType ?? fallbackType,
    };

    const erroredCheck = checks.find((check) => check.error);
    if (erroredCheck?.error) {
      responseBody.error = erroredCheck.error;
    }

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rate limit error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
