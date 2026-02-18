import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  normalizeReportPayload,
} from "./utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateLimitResponse {
  allowed?: boolean;
  remaining?: number;
  retryAfter?: number;
  resetAt?: string;
  identifierType?: "user" | "ip";
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
    await client.rpc("log_security_event", {
      _user_id: userId ?? null,
      _event_type: eventType,
      _event_data: eventData ?? null,
      _ip_address: ipAddress ?? null,
      _user_agent: userAgent ?? null,
    });
  } catch (error) {
    console.warn("[report-confession] Failed to log security event", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", messageKey: "common.method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("[report-confession] Missing Supabase configuration");
    return jsonResponse({ error: "CONFIGURATION_ERROR", message: "Server is misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "UNAUTHORIZED", messageKey: "common.unauthorized" }, 401);
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
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
      console.warn("[report-confession] Failed to parse request body", parseError);
      return jsonResponse({ error: "INVALID_JSON", messageKey: "common.invalid_request" }, 400);
    }

    const normalizedPayload = normalizeReportPayload(rawBody);
    if (!normalizedPayload.ok) {
      return jsonResponse({ error: normalizedPayload.error, messageKey: "common.invalid_request" }, 400);
    }

    const { confessionId, reason: normalizedReason, details: sanitizedDetails, language: sanitizedLanguage } =
      normalizedPayload.data;

    const rateLimitResult = await serviceClient.functions.invoke<RateLimitResponse>("rate-limit", {
      body: {
        action: "report_confession",
        ip: clientIp,
      },
      headers: { Authorization: authHeader },
    });

    if (!rateLimitResult.error && rateLimitResult.data && rateLimitResult.data.allowed === false) {
      await logSecurityEvent(serviceClient, {
        userId: user.id,
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
      }, 429);
    }

    if (rateLimitResult.error) {
      return jsonResponse({
        error: "RATE_LIMIT_UNAVAILABLE",
        messageKey: "common.something_went_wrong",
      }, 503);
    }

    const { data: existingReport, error: existingError } = await serviceClient
      .from("confession_reports")
      .select("id")
      .eq("confession_id", confessionId)
      .eq("reporter_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("[report-confession] Failed to check existing report", existingError);
      return jsonResponse({ error: "DATABASE_ERROR", messageKey: "common.something_went_wrong" }, 500);
    }

    if (existingReport) {
      await logSecurityEvent(serviceClient, {
        userId: user.id,
        eventType: "confession_report_duplicate",
        eventData: { confessionId },
        ipAddress: clientIp,
        userAgent,
      });

      return jsonResponse({ error: "ALREADY_REPORTED" }, 409);
    }

    const { error: insertError } = await serviceClient
      .from("confession_reports")
      .insert({
        confession_id: confessionId,
        reporter_id: user.id,
        reason: normalizedReason,
        details: sanitizedDetails,
      });

    if (insertError) {
      console.error("[report-confession] Failed to create report", insertError);
      return jsonResponse({ error: "DATABASE_ERROR", messageKey: "common.something_went_wrong" }, 500);
    }

    const { error: updateError } = await serviceClient
      .from("confessions")
      .update({ is_reported: true })
      .eq("id", confessionId);

    if (updateError) {
      console.error("[report-confession] Failed to flag confession", updateError);
    }

    await logSecurityEvent(serviceClient, {
      userId: user.id,
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
    });
  } catch (error) {
    console.error("[report-confession] Unexpected error", error);
    return jsonResponse({ error: "INTERNAL_ERROR", messageKey: "common.something_went_wrong" }, 500);
  }
});
