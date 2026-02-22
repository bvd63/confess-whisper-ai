import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipPriceIds } from "../_shared/stripe-config.ts";
import { corsHeaders, getAuthenticatedRequestContext, jsonResponse } from "../_shared/edge-auth.ts";
import { syncSubscriptionFromCheckoutSession } from "../_shared/subscription-payments.ts";
import { createStripeClient } from "../_shared/stripe.ts";

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ level, message, data, timestamp: new Date().toISOString() }));
};

const VIP_PRICE_IDS = getVipPriceIds();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const auth = await getAuthenticatedRequestContext(req);
    if (!auth.ok) return auth.response;

    // Accept session_id from body OR query string
    let sessionId: string | null = null;
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await req.json().catch(() => null);
        sessionId = body?.session_id ?? null;
      }
    } catch (_) {
      // ignore body parse errors
    }
    if (!sessionId) {
      const url = new URL(req.url);
      sessionId = url.searchParams.get("session_id");
    }
    if (!sessionId) return jsonResponse({ error: "INVALID_REQUEST" }, 400);

    log("info", "Billing confirmation request", { userId: auth.context.userId, sessionId });

    const stripe = createStripeClient(Deno.env.get("STRIPE_SECRET_KEY") || "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const result = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId,
      userId: auth.context.userId,
      vipMonthlyPriceId: VIP_PRICE_IDS.monthly,
      vipYearlyPriceId: VIP_PRICE_IDS.yearly,
    });

    if (!result.success && result.error === "FORBIDDEN_SESSION_OWNERSHIP") {
      log("warn", "Rejected billing confirmation due to session ownership mismatch", {
        userId: auth.context.userId,
        sessionId,
      });
      return jsonResponse({ error: "FORBIDDEN_SESSION_OWNERSHIP" }, 403);
    }

    if (!result.success && result.processing) {
      return jsonResponse({ processing: true, status: result.status, message: "payment_processing" }, 200);
    }

    if (!result.success) {
      log("error", "Failed to confirm billing", { userId: auth.context.userId, error: result.error });
      return jsonResponse({ processing: true, message: "update_failed" }, 200);
    }

    if (!result.alreadyUpdated) {
      // Webhook reconciliation is the only source of truth for entitlements.
      return jsonResponse({
        processing: true,
        status: result.status ?? null,
        message: "awaiting_webhook_reconciliation",
        applied: "webhook",
      }, 200);
    }

    return jsonResponse({
      processing: false,
      active: result.tier === "vip",
      tier: result.tier,
      subscription_end: result.subscriptionEnd ?? null,
      alreadyUpdated: true,
      applied: "webhook",
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Billing confirmation error", { error: errorMessage });
    return jsonResponse({ error: errorMessage }, 400);
  }
});
