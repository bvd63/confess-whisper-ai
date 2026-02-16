import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipMonthlyPriceId, getVipYearlyPriceId } from "../_shared/stripe-config.ts";
import { corsHeaders, getAuthenticatedRequestContext, jsonResponse } from "../_shared/edge-auth.ts";
import { syncSubscriptionFromCheckoutSession } from "../_shared/subscription-payments.ts";
import { createStripeClient } from "../_shared/stripe.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "CONFIGURATION_ERROR" }, 500);

    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId) return jsonResponse({ error: "INVALID_REQUEST" }, 400);

    const stripe = createStripeClient(stripeKey);
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const result = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId,
      userId: auth.context.userId,
      vipMonthlyPriceId: getVipMonthlyPriceId(),
      vipYearlyPriceId: getVipYearlyPriceId(),
    });

    if (!result.success && result.processing) {
      return jsonResponse({ success: false, status: result.status }, 200);
    }

    if (!result.success) {
      logStep("Subscription verification failed", { userId: auth.context.userId, sessionId, error: result.error });
      return jsonResponse({ error: result.error ?? "SUBSCRIPTION_VERIFY_FAILED" }, 400);
    }

    return jsonResponse({
      success: true,
      tier: result.tier,
      cadence: result.cadence,
      subscriptionEnd: result.subscriptionEnd,
      alreadyUpdated: result.alreadyUpdated ?? false,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return jsonResponse({ error: "VERIFY_SUBSCRIPTION_PAYMENT_FAILED" }, 400);
  }
});