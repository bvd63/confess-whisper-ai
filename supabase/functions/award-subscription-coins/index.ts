import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  getAuthenticatedRequestContext,
  jsonResponse,
  requireInternalSecret,
} from "../_shared/edge-auth.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AWARD-SUBSCRIPTION-COINS] ${step}${detailsStr}`);
};

const BONUS_BY_TIER: Record<string, number> = {
  vip: 250,
};

const awardBonusCoins = async (
  supabaseClient: any,
  {
    userId,
    amount,
    tier,
  }: {
    userId: string;
    amount: number;
    tier: string;
  },
) => {
  const referenceId = crypto.randomUUID();
  let result = await supabaseClient.rpc('award_coins', {
    _user_id: userId,
    _amount: amount,
    _type: `subscription_${tier}_bonus`,
    _description: `Welcome bonus for activating ${tier.toUpperCase()} subscription`,
    _reference_id: referenceId,
  });

  if (!result.error) return result;

  // Backwards-compatible fallback for deployments exposing p_* signature.
  result = await supabaseClient.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_session_id: `subscription_bonus_${tier}_${userId}`,
    p_description: `Welcome bonus for activating ${tier.toUpperCase()} subscription`,
  });

  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const internal = requireInternalSecret(req);
    const isInternal = internal.ok;

    let userId = "";
    if (isInternal) {
      const requestedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!requestedUserId) {
        return jsonResponse({ error: "INVALID_REQUEST" }, 400);
      }
      userId = requestedUserId;
    } else {
      const auth = await getAuthenticatedRequestContext(req);
      if (!auth.ok) return auth.response;
      userId = auth.context.userId;

      const requestedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (requestedUserId && requestedUserId !== userId) {
        return jsonResponse({ error: "FORBIDDEN_USER_MISMATCH" }, 403);
      }
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, subscription_status, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) {
      logStep("Unable to load user subscription profile", { userId, error: profileError.message });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500);
    }

    const effectiveTier = String(profile?.subscription_tier ?? "").toLowerCase();
    const effectiveStatus = String(profile?.subscription_status ?? "").toLowerCase();

    if (!effectiveTier || effectiveTier === "free" || !BONUS_BY_TIER[effectiveTier]) {
      logStep("No bonus eligible tier", { userId, effectiveTier });
      return new Response(JSON.stringify({ success: true, awarded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!["active", "trialing"].includes(effectiveStatus)) {
      logStep("Subscription status not eligible for bonus", { userId, effectiveStatus });
      return jsonResponse({ success: true, awarded: false }, 200);
    }

    if (!profile?.stripe_subscription_id && !isInternal) {
      // Authenticated users should only receive bonus after a real paid subscription exists.
      logStep("Missing stripe_subscription_id for non-internal award", { userId });
      return jsonResponse({ success: true, awarded: false }, 200);
    }

    logStep("Processing subscription bonus", { userId, effectiveTier, effectiveStatus });

    // Check if coins already awarded for this tier
    const { data: existingTransaction } = await supabaseClient
      .from('coin_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', `subscription_${effectiveTier}_bonus`)
      .maybeSingle();

    if (existingTransaction) {
      logStep("Coins already awarded for this tier");
      return new Response(JSON.stringify({ success: true, awarded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const coinsToAward = BONUS_BY_TIER[effectiveTier] ?? 0;
    
    if (coinsToAward === 0) {
      throw new Error("Invalid tier for coin award");
    }

    const { error: awardError } = await awardBonusCoins(supabaseClient, {
      userId,
      amount: coinsToAward,
      tier: effectiveTier,
    });

    if (awardError) {
      logStep("Error awarding coins", { error: awardError });
      throw awardError;
    }

    logStep("Coins awarded successfully", { amount: coinsToAward });

    return new Response(JSON.stringify({ 
      success: true, 
      awarded: true, 
      amount: coinsToAward 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return jsonResponse({ error: "AWARD_SUBSCRIPTION_COINS_FAILED" }, 500);
  }
});
