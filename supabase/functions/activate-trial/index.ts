import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  getAuthenticatedRequestContext,
  jsonResponse,
  requireInternalSecret,
} from "../_shared/edge-auth.ts";

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ 
    level, 
    message, 
    data, 
    timestamp: new Date().toISOString(),
    function: "activate-trial" 
  }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("info", "Trial activation request received");

    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) return auth.response;

    const internal = requireInternalSecret(req);
    if (!internal.ok) return internal.response;

    const authUserId = auth.context.userId;
    log("info", "User authenticated for internal trial activation", { userId: authUserId });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const userIdFromSnake = body["user_id"];
    const userIdFromCamel = body["userId"];
    const requestedUserId = typeof userIdFromSnake === "string"
      ? userIdFromSnake.trim()
      : typeof userIdFromCamel === "string"
        ? userIdFromCamel.trim()
        : "";

    if (requestedUserId && requestedUserId !== authUserId) {
      log("warn", "Cross-user trial activation attempt blocked", {
        authUserId,
        requestedUserId,
      });
      return jsonResponse({ error: "FORBIDDEN_USER_MISMATCH" }, 403);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Activate trial using service-role-only RPC (one-time, 3-day window).
    const { data: result, error: activateError } = await supabaseAdmin
      .rpc("activate_trial", { _user_id: authUserId });

    if (activateError) {
      log("error", "Failed to activate trial", { error: activateError });
      throw activateError;
    }

    const outcome = (result ?? {}) as Record<string, unknown>;
    if (!outcome.success) {
      const normalizedError = String(outcome.error ?? "").toUpperCase();
      if (normalizedError === "TRIAL_ALREADY_USED") {
        log("warn", "Trial already used", { userId: authUserId });
        return jsonResponse({
          success: false,
          error: "TRIAL_ALREADY_USED",
          messageKey: "trial.already_used",
          message: "You have already used your free trial",
          trial_activated_at: outcome.trial_activated_at ?? null,
          trial_ends_at: outcome.trial_ends_at ?? null,
          trial_duration_days: 3,
        }, 409);
      }

      log("error", "Trial activation failed", { result: outcome });
      return jsonResponse({
        success: false,
        error: outcome.error ?? "TRIAL_ACTIVATION_FAILED",
        message: "Failed to activate trial",
      }, 400);
    }

    log("info", "Trial activated successfully", { 
      userId: authUserId,
      trialEndsAt: outcome.trial_ends_at,
    });

    return jsonResponse({
      success: true,
      trial_activated_at: outcome.trial_activated_at ?? null,
      trial_ends_at: outcome.trial_ends_at ?? null,
      trial_duration_days: outcome.trial_duration_days ?? 3,
      message: "Trial activated successfully",
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Trial activation error", { error: errorMessage });
    return jsonResponse({ error: errorMessage }, 400);
  }
});
