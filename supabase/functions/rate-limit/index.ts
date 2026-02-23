import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getAuthenticatedRequestContext, requireInternalSecret } from "../_shared/edge-auth.ts";
import { getClientIp } from "../_shared/request-ip.ts";
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

const LOGIN_ACTION = "login";
const AUTH_LOGIN_ACTION = "auth_login";

const isLoginRateLimitAction = (action: string): boolean =>
  action === LOGIN_ACTION || action === AUTH_LOGIN_ACTION;

const hashRateLimitKey = async (value: string): Promise<string> => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const pruneExpiredRateLimits = async (supabaseClient: any): Promise<void> => {
  const nowIso = new Date().toISOString();
  const { error } = await supabaseClient
    .from('rate_limits')
    .delete()
    .lt('reset_at', nowIso);

  if (error) {
    console.warn('[rate-limit] Failed to prune expired rate-limit rows', error);
  }
};

const applyRateLimit = async (
  supabaseClient: any,
  action: string,
  identifier: RateLimitIdentifier,
  config: RateLimitConfig,
  options: { failClosed?: boolean } = {},
): Promise<RateLimitCheckResult> => {
  const { failClosed = false } = options;
  const keyMaterial = `${action}:${identifier.type}:${identifier.value}`;
  const key = await hashRateLimitKey(keyMaterial);
  const now = new Date();
  const fallbackResetAt = new Date(now.getTime() + config.windowMs).toISOString();

  const { data: atomicData, error: rpcError } = await supabaseClient.rpc(
    'increment_rate_limit_counter',
    { _key: key, _window_ms: config.windowMs },
  );

  if (rpcError) {
    console.error('[rate-limit] Atomic counter RPC failed:', rpcError);
    if (failClosed) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: fallbackResetAt,
        retryAfter: Math.max(1, Math.ceil(config.windowMs / 1000)),
        identifierType: identifier.type,
        error: 'RATE_LIMIT_UNAVAILABLE',
      };
    }

    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: fallbackResetAt,
      identifierType: identifier.type,
      error: 'RATE_LIMIT_STORAGE_ERROR',
    };
  }

  const row = Array.isArray(atomicData) ? atomicData[0] : atomicData;
  const currentCount = Number(row?.current_count);
  const parsedResetAt = row?.reset_at ? new Date(row.reset_at) : null;
  const resetAt = parsedResetAt && !Number.isNaN(parsedResetAt.getTime())
    ? parsedResetAt.toISOString()
    : fallbackResetAt;

  if (!Number.isFinite(currentCount) || currentCount < 1) {
    console.error('[rate-limit] Invalid atomic counter response:', { key, row });
    if (failClosed) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, Math.ceil((new Date(resetAt).getTime() - now.getTime()) / 1000)),
        identifierType: identifier.type,
        error: 'RATE_LIMIT_UNAVAILABLE',
      };
    }

    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt,
      identifierType: identifier.type,
      error: 'RATE_LIMIT_STORAGE_ERROR',
    };
  }

  if (currentCount > config.maxAttempts) {
    const retryAfter = Math.max(1, Math.ceil((new Date(resetAt).getTime() - now.getTime()) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
      identifierType: identifier.type,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.maxAttempts - currentCount),
    resetAt,
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

    const bodyForNormalization =
      rawBody && typeof rawBody === "object"
        ? { ...(rawBody as Record<string, unknown>) }
        : {};

    const requestedAction = typeof bodyForNormalization.action === "string"
      ? bodyForNormalization.action.trim().toLowerCase()
      : "";
    const isRequestedLoginAction = isLoginRateLimitAction(requestedAction);

    if (isRequestedLoginAction) {
      const inferredIp = getClientIp(req);
      if (inferredIp && inferredIp !== "unknown") {
        bodyForNormalization.ip = inferredIp;
      } else {
        delete bodyForNormalization.ip;
      }

      delete bodyForNormalization.userId;

      const internal = requireInternalSecret(req);
      if (!internal.ok) {
        delete bodyForNormalization.loginIdentifierHash;
      }
    }

    const normalized = normalizeRateLimitRequest(bodyForNormalization);
    if (!normalized.ok) {
      if (isRequestedLoginAction) {
        return new Response(
          JSON.stringify({
            allowed: false,
            error: 'RATE_LIMIT_UNAVAILABLE',
            messageKey: 'common.rate_limit',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ error: normalized.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { action, identifiers: normalizedIdentifiers, config } = normalized.data;
    const isLoginAction = isLoginRateLimitAction(action);

    const authContext = await getAuthenticatedRequestContext(req);
    if (!authContext.ok) {
      if (!isLoginAction) {
        const internal = requireInternalSecret(req);
        if (!internal.ok) {
          return internal.response;
        }
      }
    }

    // Initialize Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (isLoginAction || Math.random() < 0.02) {
      await pruneExpiredRateLimits(supabaseClient);
    }

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
    if (user?.id && !isLoginAction) {
      identifiers = [{ value: user.id, type: 'user' }];
    } else {
      const userIdentifier = normalizedIdentifiers.find((identifier) => identifier.type === 'user');
      const ipIdentifier = normalizedIdentifiers.find((identifier) => identifier.type === 'ip');
      let resolvedIpIdentifier = ipIdentifier;

      if (isLoginAction && !resolvedIpIdentifier) {
        const inferredIp = getClientIp(req);
        if (inferredIp && inferredIp !== "unknown") {
          resolvedIpIdentifier = { value: inferredIp, type: "ip" };
        }
      }

      if (!userIdentifier && !resolvedIpIdentifier) {
        if (isLoginAction) {
          return new Response(
            JSON.stringify({
              allowed: false,
              error: 'RATE_LIMIT_UNAVAILABLE',
              messageKey: 'common.rate_limit',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        return new Response(
          JSON.stringify({ error: 'MISSING_IDENTIFIER' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      identifiers = isLoginAction
        ? [userIdentifier, resolvedIpIdentifier].filter(Boolean) as RateLimitIdentifier[]
        : [userIdentifier ?? resolvedIpIdentifier!];
    }

    const checks: RateLimitCheckResult[] = [];
    for (const identifier of identifiers) {
      const result = await applyRateLimit(supabaseClient, action, identifier, config, {
        failClosed: isLoginAction,
      });
      if (!result.allowed) {
        const retryAfterSeconds = result.retryAfter ?? Math.ceil(config.windowMs / 1000);
        if (isLoginAction) {
          return new Response(
            JSON.stringify({
              allowed: false,
              retryAfterSeconds,
              retryAfter: retryAfterSeconds,
              error: result.error === 'RATE_LIMIT_UNAVAILABLE' ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
              messageKey: "common.rate_limit",
              identifierType: result.identifierType,
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': retryAfterSeconds.toString(),
                'X-RateLimit-Limit': config.maxAttempts.toString(),
                'X-RateLimit-Remaining': '0',
              },
            },
          );
        }

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
    if (isLoginAction) {
      return new Response(
        JSON.stringify({ allowed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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
