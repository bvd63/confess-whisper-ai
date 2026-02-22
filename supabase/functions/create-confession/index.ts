import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  evaluateCreateConfessionRateLimit,
  guardCommunitiesDisabled,
  normalizeCreateConfessionPayload,
  type CreateConfessionRateLimitInvokeResult,
  type CreateConfessionRateLimitResponse,
} from "./utils.ts";
import { getClientIp } from "../_shared/request-ip.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyCaptcha(token: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");

  if (!turnstileSecret) {
    console.warn("[create-confession] TURNSTILE_SECRET not configured – skipping CAPTCHA verification");
    return { success: true as const };
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.error("[create-confession] CAPTCHA verification failed", data);
      return { success: false as const, error: "auth.captcha_failed" };
    }

    return { success: true as const };
  } catch (error) {
    console.error("[create-confession] CAPTCHA verification error", error);
    return { success: false as const, error: "auth.captcha_failed" };
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const logSecurityEvent = async (
  client: any,
  {
    userId,
    eventType,
    eventData,
    ipAddress,
    userAgent,
  }: {
    userId?: string | null;
    eventType: string;
    eventData?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) => {
  if (!client) return;

  try {
    const { error } = await client.rpc("log_security_event", {
      _user_id: userId ?? null,
      _event_type: eventType,
      _event_data: eventData ?? null,
      _ip_address: ipAddress ?? null,
      _user_agent: userAgent ?? null,
    });
    
    if (error) {
      console.warn("[create-confession] Failed to log security event", error);
    }
  } catch (error) {
    console.warn("[create-confession] Failed to log security event", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("[create-confession] Missing Supabase configuration");
    return jsonResponse({ error: "CONFIGURATION_ERROR", message: "Server is misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "UNAUTHORIZED", messageKey: "common.unauthorized" }, 401);
  }

  const clientIp = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  try {
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "UNAUTHORIZED", messageKey: "common.unauthorized" }, 401);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      console.warn("[create-confession] Failed to parse request body", parseError);
      return jsonResponse({ error: "INVALID_JSON", messageKey: "common.invalid_request" }, 400);
    }

    const communityGuard = guardCommunitiesDisabled(rawBody);
    if (!communityGuard.ok) {
      return jsonResponse({
        error: communityGuard.error,
        messageKey: "confession.communities_disabled",
      }, communityGuard.status);
    }

    const normalizedBody = normalizeCreateConfessionPayload(rawBody);

    if (!normalizedBody.ok) {
      await logSecurityEvent(serviceClient, {
        userId: user.id,
        eventType: "confession_validation_failed",
        eventData: {
          reason: normalizedBody.error.logReason,
          ...(normalizedBody.error.context ?? {}),
        },
        ipAddress: clientIp,
        userAgent,
      });

      const errorResponse = normalizedBody.error.code === "INVALID_CONTENT"
        ? {
            error: "INVALID_CONTENT",
            messageKey: "confession.invalid_content",
            message: "Confession content is invalid.",
          }
        : {
            error: "CONTENT_TOO_SHORT",
            messageKey: "confession.too_short",
            message: "Confession must be at least 10 characters long.",
          };

      return jsonResponse(errorResponse, 400);
    }

    const payload = normalizedBody.data;

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
    const confessionTurnstileRequired = Deno.env.get("CONFESSION_TURNSTILE_REQUIRED");

    // Enforce CAPTCHA only when explicitly enabled AND a Turnstile secret is configured.
    // This prevents broken submissions in environments where CAPTCHA isn't set up.
    const enforceCaptcha = Boolean(turnstileSecret) && confessionTurnstileRequired === "true";

    if (enforceCaptcha) {
      if (!payload.captchaToken) {
        await logSecurityEvent(serviceClient, {
          userId: user.id,
          eventType: "confession_captcha_failed",
          eventData: { reason: "missing_token" },
          ipAddress: clientIp,
          userAgent,
        });
        return jsonResponse({ error: "CAPTCHA_REQUIRED", messageKey: "auth.captcha_failed" }, 403);
      }

      const captchaResult = await verifyCaptcha(payload.captchaToken, clientIp);
      if (!captchaResult.success) {
        await logSecurityEvent(serviceClient, {
          userId: user.id,
          eventType: "confession_captcha_failed",
          eventData: { reason: captchaResult.error ?? "verification_failed" },
          ipAddress: clientIp,
          userAgent,
        });
        return jsonResponse({ error: "CAPTCHA_FAILED", messageKey: captchaResult.error ?? "auth.captcha_failed" }, 403);
      }
    } else if (payload.captchaToken && turnstileSecret) {
      // If token provided but enforcement disabled, verify opportunistically when Turnstile is configured
      await verifyCaptcha(payload.captchaToken, clientIp);
    }

    const rateLimitResult = await serviceClient.functions.invoke<CreateConfessionRateLimitResponse>("rate-limit", {
      body: {
        action: "confession_create",
        userId: user.id,
        ip: clientIp,
      },
      headers: {
        Authorization: authHeader,
      },
    });

    const rateLimitDecision = evaluateCreateConfessionRateLimit(
      rateLimitResult as CreateConfessionRateLimitInvokeResult,
    );

    if (!rateLimitDecision.canCreate && rateLimitDecision.kind === "limited") {
      await logSecurityEvent(serviceClient, {
        userId: user.id,
        eventType: "confession_rate_limited",
        eventData: {
          retryAfter: rateLimitDecision.retryAfter ?? null,
          remaining: rateLimitDecision.data.remaining ?? null,
        },
        ipAddress: clientIp,
        userAgent,
      });
      return jsonResponse({
        error: "RATE_LIMIT",
        messageKey: "common.rate_limit",
        retryAfter: rateLimitDecision.retryAfter,
      }, 429);
    }

    if (!rateLimitDecision.canCreate && rateLimitDecision.kind === "unavailable") {
      await logSecurityEvent(serviceClient, {
        userId: user.id,
        eventType: "confession_rate_limit_error",
        eventData: {
          reason: "rate_limit_unavailable",
          invokeError: rateLimitResult.error
            ? String((rateLimitResult.error as { message?: unknown }).message ?? rateLimitResult.error)
            : null,
        },
        ipAddress: clientIp,
        userAgent,
      });

      // Fail closed: never create confession if rate-limit storage/invoke is unavailable.
      return jsonResponse({
        error: "RATE_LIMIT_UNAVAILABLE",
        messageKey: "common.something_went_wrong",
      }, 503);
    }

    const { data: confessionInsert, error: insertError } = await serviceClient
      .from("confessions")
      .insert({
        content: payload.content,
        category: payload.category,
        user_id: user.id,
        image_url: payload.imageUrl,
        community_id: payload.communityId,
        is_anonymous: payload.isAnonymous,
        ai_response: payload.aiResponse,
        author_display_name_snapshot: payload.isAnonymous ? null : payload.authorDisplayName,
      })
      .select()
      .single();

    if (insertError || !confessionInsert) {
      console.error("[create-confession] Failed to insert confession", insertError);
      await logSecurityEvent(serviceClient, {
        userId: user.id,
        eventType: "confession_create_failed",
        eventData: { reason: insertError?.message ?? "insert_failed" },
        ipAddress: clientIp,
        userAgent,
      });
      return jsonResponse({ error: "DATABASE_ERROR", messageKey: "common.something_went_wrong" }, 500);
    }

    const sanitizedMood = payload.mood;

    if (sanitizedMood?.mood) {
      const { error: moodError } = await serviceClient
        .from("mood_entries")
        .insert({
          user_id: user.id,
          confession_id: confessionInsert.id,
          mood: sanitizedMood.mood,
          intensity: sanitizedMood.intensity,
        });

      if (moodError) {
        console.error("[create-confession] Failed to insert mood entry", moodError);
      }
    }

    await logSecurityEvent(serviceClient, {
      userId: user.id,
      eventType: "confession_created",
      eventData: { confessionId: confessionInsert.id },
      ipAddress: clientIp,
      userAgent,
    });

    return jsonResponse({
      confession: confessionInsert,
      rateLimit: rateLimitDecision.data,
    }, 201);
  } catch (error) {
    console.error("[create-confession] Unexpected error", error);
    return jsonResponse({ error: "INTERNAL_ERROR", messageKey: "common.something_went_wrong" }, 500);
  }
});
