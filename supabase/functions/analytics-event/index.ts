import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const AnalyticsEventSchema = z.object({
  event_type: z.string().min(1).max(100),
  event_data: z.record(z.any()).optional(),
});

serve(async (req) => {
  const { origin, ipAddress, userAgent } = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.client) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("analytics-event: invalid JSON", { userId: authResult.user.id, parseError });
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = AnalyticsEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("analytics-event: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const { error } = await authResult.client
      .from("analytics_events")
      .insert({
        user_id: authResult.user.id,
        event_type: payload.event_type,
        event_data: payload.event_data ?? {},
      });

    if (error) {
      logError("analytics-event: insert failed", {
        userId: authResult.user.id,
        error: error.message,
      });
      return jsonResponse({ error: "PERSISTENCE_ERROR" }, 500, origin);
    }

    logInfo("analytics-event: recorded", {
      userId: authResult.user.id,
      eventType: payload.event_type,
      ipAddress,
      userAgent,
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    logError("analytics-event: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, req.headers.get("origin"));
  }
});