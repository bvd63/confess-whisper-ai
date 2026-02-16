import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, getAuthenticatedRequestContext, jsonResponse } from "../_shared/edge-auth.ts";
import {
  awardPurchasedCoins,
  hasExistingCoinAward,
  parseCoinPurchaseFromSession,
} from "../_shared/coin-payments.ts";
import { createStripeClient } from "../_shared/stripe.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COIN-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "CONFIGURATION_ERROR" }, 500);

    let sessionId = "";
    try {
      const body = await req.json();
      sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    } catch {
      sessionId = "";
    }
    if (!sessionId) return jsonResponse({ error: "INVALID_REQUEST" }, 400);

    logStep("Verifying coin payment session", { userId: auth.context.userId, sessionId });

    const stripe = createStripeClient(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const parsed = parseCoinPurchaseFromSession(session, auth.context.userId);
    if (!parsed.ok) {
      if (parsed.error === "FORBIDDEN_USER_MISMATCH") {
        return jsonResponse({ error: parsed.error }, 403);
      }
      if (parsed.error === "PAYMENT_NOT_COMPLETED") {
        return jsonResponse({ success: false, status: session.payment_status }, 200);
      }
      return jsonResponse({ error: parsed.error }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const duplicateCheck = await hasExistingCoinAward(
      supabaseAdmin,
      parsed.data.userId,
      sessionId,
    );
    if (duplicateCheck.error) {
      logStep("Duplicate check failed", { error: duplicateCheck.error });
      return jsonResponse({ error: "DUPLICATE_CHECK_FAILED" }, 500);
    }

    if (duplicateCheck.exists) {
      return jsonResponse({
        success: true,
        alreadyAwarded: true,
        coins: parsed.data.coins,
      }, 200);
    }

    const { error: awardError } = await awardPurchasedCoins(supabaseAdmin, {
      userId: parsed.data.userId,
      coins: parsed.data.coins,
      sessionId,
      description: `Purchased ${parsed.data.coins} coins`,
    });

    if (awardError) {
      logStep("Error awarding purchased coins", { error: awardError });
      return jsonResponse({ error: "AWARD_FAILED" }, 500);
    }

    return jsonResponse({
      success: true,
      awarded: true,
      coins: parsed.data.coins,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return jsonResponse({ error: "VERIFY_COIN_PAYMENT_FAILED" }, 400);
  }
});