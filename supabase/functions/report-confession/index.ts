import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { getServerEnv } from "../_shared/env.ts";
import { logError, logWarn } from "../_shared/logger.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";
import { normalizeReportPayload } from "./utils.ts";

interface RateLimitResponse {
  allowed?: boolean;
  remaining?: number;
  retryAfter?: number;
  resetAt?: string;
  identifierType?: "user" | "ip";
}

const logSecurityEvent = async (
  client: ReturnType<typeof createServiceClient>,
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
      logWarn("Failed to log security event", { error: error.message, eventType });
    }
  } catch (error) {
    logWarn("Failed to log security event", { error: error instanceof Error ? error.message : String(error), eventType });
  }
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", messageKey: "common.method_not_allowed" }, 405, origin);
  }

  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user) {
      return jsonResponse({ error: "UNAUTHORIZED", messageKey: "common.unauthorized" }, 401, origin);
    }

    const serviceClient = createServiceClient();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (error) {
      logWarn("Failed to parse report-confession payload", {
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse({ error: "INVALID_JSON", messageKey: "common.invalid_request" }, 400, origin);
    }

    const normalizedPayload = normalizeReportPayload(rawBody);
    if (!normalizedPayload.ok) {
      return jsonResponse({ error: normalizedPayload.error, messageKey: "common.invalid_request" }, 400, origin);
    }

    const { confessionId, reason: normalizedReason, details: sanitizedDetails, language: sanitizedLanguage } =
      normalizedPayload.data;

    const rateLimitResult = await serviceClient.functions.invoke<RateLimitResponse>("rate-limit", {
      body: {
        action: "report_confession",
        userId: authResult.user.id,
        ip: clientIp,
      },
      headers: {
        "x-edge-token": env.EDGE_INTERNAL_TOKEN,
      },
    });

    if (rateLimitResult.error) {
      logWarn("Rate limit invocation failed", {
        error: rateLimitResult.error.message ?? String(rateLimitResult.error),
        action: "report_confession",
      });
    }

    if (!rateLimitResult.error && rateLimitResult.data && rateLimitResult.data.allowed === false) {
      await logSecurityEvent(serviceClient, {
        userId: authResult.user.id,
        eventType: "confession_report_rate_limited",
        eventData: {
          confessionId,
          remaining: rateLimitResult.data.remaining ?? null,
          retryAfter: rateLimitResult.data.retryAfter ?? null,
        },
        ipAddress: clientIp,
        userAgent,
      });

      return jsonResponse({
        error: "RATE_LIMIT",
        messageKey: "common.rate_limit",
        retryAfter: rateLimitResult.data.retryAfter ?? null,
      }, 429, origin);
    }

    const { data: existingReport, error: existingError } = await serviceClient
      .from("confession_reports")
      .select("id")
      .eq("confession_id", confessionId)
      .eq("reporter_id", authResult.user.id)
      .maybeSingle();

    if (existingError) {
      logError("Failed to check existing report", { error: existingError.message });
      return jsonResponse({ error: "DATABASE_ERROR", messageKey: "common.something_went_wrong" }, 500, origin);
    }

    if (existingReport) {
      await logSecurityEvent(serviceClient, {
        userId: authResult.user.id,
        eventType: "confession_report_duplicate",
        eventData: { confessionId },
        ipAddress: clientIp,
        userAgent,
      });

      return jsonResponse({ error: "ALREADY_REPORTED" }, 409, origin);
    }

    const { error: insertError } = await serviceClient
      .from("confession_reports")
      .insert({
        confession_id: confessionId,
        reporter_id: authResult.user.id,
        reason: normalizedReason,
        details: sanitizedDetails,
      });

    if (insertError) {
      logError("Failed to create confession report", { error: insertError.message });
      return jsonResponse({ error: "DATABASE_ERROR", messageKey: "common.something_went_wrong" }, 500, origin);
    }

    const { error: updateError } = await serviceClient
      .from("confessions")
      .update({ is_reported: true })
      .eq("id", confessionId);

    if (updateError) {
      logWarn("Failed to flag confession after report", { error: updateError.message, confessionId });
    }

    await logSecurityEvent(serviceClient, {
      userId: authResult.user.id,
      eventType: "confession_reported",
      eventData: {
        confessionId,
        reason: normalizedReason,
        language: sanitizedLanguage,
      },
      ipAddress: clientIp,
      userAgent,
    });

    return jsonResponse({
      success: true,
      messageKey: "report.success",
    }, 200, origin);
  } catch (error) {
    logError("Unexpected error in report-confession", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR", messageKey: "common.something_went_wrong" }, 500, origin);
  }
});
