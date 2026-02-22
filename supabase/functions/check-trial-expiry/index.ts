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

interface TrialProfileRow {
  user_id: string;
  trial_active: boolean | null;
  trial_end_date: string | null;
  trial_premium_ends_at: string | null;
}

const resolveExpiryState = (profile: Pick<TrialProfileRow, "trial_active" | "trial_end_date" | "trial_premium_ends_at">, now: Date) => {
  const premiumExpired = Boolean(
    profile.trial_premium_ends_at &&
    now > new Date(profile.trial_premium_ends_at),
  );
  const legacyExpired = Boolean(
    profile.trial_active &&
    profile.trial_end_date &&
    now > new Date(profile.trial_end_date),
  );

  return { premiumExpired, legacyExpired };
};

const deactivateTrialForUser = async (
  supabaseClient: any,
  {
    userId,
    premiumExpired,
  }: {
    userId: string;
    premiumExpired: boolean;
  },
): Promise<{ revokeError: boolean; updateError?: string }> => {
  const { error: revokeError } = await supabaseClient.rpc("revoke_trial_purchases", {
    _user_id: userId,
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
    .eq("user_id", userId);

  if (updateError) {
    return { revokeError: Boolean(revokeError), updateError: updateError.message };
  }

  return { revokeError: Boolean(revokeError) };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const internal = requireInternalSecret(req);
  if (!internal.ok) return internal.response;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const targetUserId = await resolveTargetUserId(req);
    if (!targetUserId) {
      const now = new Date();
      const nowIso = now.toISOString();

      const { data: activeProfiles, error: activeProfilesError } = await supabaseClient
        .from("profiles")
        .select("user_id, trial_active, trial_end_date, trial_premium_ends_at")
        .eq("trial_active", true)
        .or(`trial_end_date.lt.${nowIso},trial_premium_ends_at.lt.${nowIso}`);

      if (activeProfilesError) throw activeProfilesError;

      let expiredCount = 0;
      let deactivatedCount = 0;
      let failedCount = 0;
      let revokedCount = 0;

      for (const profile of (activeProfiles ?? []) as TrialProfileRow[]) {
        const { premiumExpired, legacyExpired } = resolveExpiryState(profile, now);
        if (!premiumExpired && !legacyExpired) continue;

        expiredCount += 1;
        const result = await deactivateTrialForUser(supabaseClient, {
          userId: profile.user_id,
          premiumExpired,
        });
        if (result.updateError) {
          failedCount += 1;
          console.error("[CHECK-TRIAL-EXPIRY] Failed to deactivate expired trial", {
            userId: profile.user_id,
            error: result.updateError,
          });
          continue;
        }

        deactivatedCount += 1;
        if (!result.revokeError) revokedCount += 1;
      }

      return jsonResponse({
        success: true,
        mode: "batch",
        scanned: (activeProfiles ?? []).length,
        expired: expiredCount,
        deactivated: deactivatedCount,
        trialPurchasesRevoked: revokedCount,
        failed: failedCount,
      }, 200);
    }

    console.log(`[CHECK-TRIAL-EXPIRY] Checking trial for user ${targetUserId}`);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_active, trial_end_date, trial_premium_ends_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return jsonResponse({ error: "PROFILE_NOT_FOUND" }, 404);

    const now = new Date();
    const { premiumExpired, legacyExpired } = resolveExpiryState(profile, now);

    if (!premiumExpired && !legacyExpired) {
      return jsonResponse({
        trialExpired: false,
        trialActive: profile.trial_active,
        message: "Trial status checked",
      }, 200);
    }

    const deactivateResult = await deactivateTrialForUser(supabaseClient, {
      userId: targetUserId,
      premiumExpired,
    });
    if (deactivateResult.updateError) throw new Error(deactivateResult.updateError);

    return jsonResponse({
      trialExpired: true,
      message: "Trial expired; awaiting webhook reconciliation",
      trialPurchasesRevoked: !deactivateResult.revokeError,
      trialActive: false,
    }, 200);
  } catch (error) {
    console.error("[CHECK-TRIAL-EXPIRY] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});