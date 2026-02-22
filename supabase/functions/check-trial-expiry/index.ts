import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonResponse, requireInternalSecret } from "../_shared/edge-auth.ts";

const resolveTargetUserId = async (req: Request): Promise<string | null> => {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("user_id")?.trim() ?? "";
  if (fromQuery) return fromQuery;

  const body = await req.json().catch(() => null);
  const fromBody = typeof body?.userId === "string" ? body.userId.trim() : "";
  return fromBody || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const internal = requireInternalSecret(req);
  if (!internal.ok) return internal.response;

  try {
    const targetUserId = await resolveTargetUserId(req);
    if (!targetUserId) {
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    console.log(`[CHECK-TRIAL-EXPIRY] Checking trial for user ${targetUserId}`);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_active, trial_end_date, trial_premium_ends_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse({ error: "PROFILE_NOT_FOUND" }, 404);

    const now = new Date();
    const premiumExpired = Boolean(
      profile.trial_premium_ends_at &&
      now > new Date(profile.trial_premium_ends_at),
    );
    const legacyExpired = Boolean(
      profile.trial_active &&
      profile.trial_end_date &&
      now > new Date(profile.trial_end_date),
    );

    if (!premiumExpired && !legacyExpired) {
      return jsonResponse({
        trialExpired: false,
        trialActive: profile.trial_active,
        message: "Trial status checked",
      }, 200);
    }

    const { error: revokeError } = await supabaseClient.rpc("revoke_trial_purchases", {
      _user_id: targetUserId,
    });
    if (revokeError) {
      console.error("[CHECK-TRIAL-EXPIRY] Error revoking trial purchases:", revokeError);
    }

    const updatePayload: Record<string, unknown> = {
      trial_active: false,
    };
    if (premiumExpired) {
      updatePayload.trial_premium_ends_at = null;
    }

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", targetUserId);
    if (updateError) throw updateError;

    return jsonResponse({
      trialExpired: true,
      message: "Trial expired; awaiting webhook reconciliation",
      trialPurchasesRevoked: !revokeError,
      trialActive: false,
    }, 200);
  } catch (error) {
    console.error("[CHECK-TRIAL-EXPIRY] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});