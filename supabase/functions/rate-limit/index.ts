import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  normalizeRateLimitRequest,
  type RateLimitIdentifier,
  type RateLimitConfig,
} from "./utils.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getServerEnv } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logWarn } from "../_shared/logger.ts";

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
  const origin = req.headers.get("origin");
  if (req.method === 'OPTIONS') {
    return handleOptions(origin);
  }

  const env = getServerEnv();

  if (req.headers.get('x-edge-token') !== env.EDGE_INTERNAL_TOKEN) {
    logWarn('Unauthorized rate-limit access attempt');
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401, origin);
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn('Rate-limit body parse failed', { error: parseError instanceof Error ? parseError.message : String(parseError) });
      return jsonResponse({ error: 'INVALID_JSON' }, 400, origin);
    }

    const normalized = normalizeRateLimitRequest(rawBody);
    if (!normalized.ok) {
      return jsonResponse({ error: normalized.error }, 400, origin);
    }

    const { action, identifiers, config } = normalized.data;

    const supabaseClient = createServiceClient();
    const checks: RateLimitCheckResult[] = [];
    for (const identifier of identifiers) {
      const result = await applyRateLimit(supabaseClient, action, identifier, config);
      if (!result.allowed) {
        const extraHeaders = result.retryAfter
          ? {
              "Retry-After": result.retryAfter.toString(),
              "X-RateLimit-Limit": config.maxAttempts.toString(),
              "X-RateLimit-Remaining": "0",
            }
          : undefined;

        return jsonResponse({
          allowed: false,
          remaining: 0,
          resetAt: result.resetAt,
          retryAfter: result.retryAfter,
          message: result.retryAfter
            ? `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
            : 'Rate limit exceeded.',
          identifierType: result.identifierType,
        }, 429, origin, extraHeaders);
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

    return jsonResponse(responseBody, 200, origin);

  } catch (error) {
    logError('Rate limit error', { error: error instanceof Error ? error.message : 'unknown' });
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500, origin);
  }
});
