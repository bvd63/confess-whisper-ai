import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ level, message, data, timestamp: new Date().toISOString() }));
};

// Map Stripe Price IDs to our tiers - dynamically built from environment
const PRICE_ID_TO_TIER: Record<string, "free" | "vip"> = {
  [Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") || ""]: "vip",
  [Deno.env.get("STRIPE_PRICE_VIP_YEARLY") || ""]: "vip",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

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
    if (!sessionId) throw new Error("session_id parameter is required");

    // Authenticated user client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    log("info", "Billing confirmation request", { userId: user.id, sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      log("info", "Payment not yet completed", { sessionId, status: session.payment_status });
      return new Response(
        JSON.stringify({ processing: true, status: session.payment_status, message: "payment_processing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If not a subscription, nothing to activate here
    if (session.mode !== "subscription") {
      log("info", "Checkout completed but not a subscription", { sessionId, mode: session.mode });
      return new Response(
        JSON.stringify({ processing: false, active: false, message: "not_a_subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const subscriptionId = (session.subscription as string) || null;
    if (!subscriptionId) {
      log("error", "No subscription id on session", { sessionId });
      return new Response(
        JSON.stringify({ processing: true, message: "subscription_pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Load subscription to determine tier and end date
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id || "";
    const tier = PRICE_ID_TO_TIER[priceId] || "free";
    const endEpoch = (subscription as any)?.current_period_end;
    const endsAtISO = typeof endEpoch === 'number' && !Number.isNaN(endEpoch)
      ? new Date(endEpoch * 1000).toISOString()
      : null;

    // Persist on profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: tier === "vip",
        subscription_tier: tier,
        subscription_status: "active",
        subscription_ends_at: endsAtISO,
        stripe_customer_id: (session.customer as string) || null,
        stripe_subscription_id: subscriptionId,
      })
      .eq("user_id", user.id);

    if (updateError) {
      log("error", "Failed to update profile after billing confirm", { userId: user.id, updateError });
      return new Response(
        JSON.stringify({ processing: true, message: "update_failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    log("info", "Subscription activated via billing-confirm", { userId: user.id, tier, subscriptionId });

    return new Response(
      JSON.stringify({ processing: false, active: true, tier, subscription_end: endsAtISO }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Billing confirmation error", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
