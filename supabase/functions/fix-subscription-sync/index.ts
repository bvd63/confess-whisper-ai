import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildPriceAllowlist,
  buildPriceTierMap,
  emitPriceGuardDecision,
  resolveTierFromPriceMap,
} from "../_shared/stripe-price-allowlist.ts";
import {
  buildSubscriptionSyncTelemetry,
  emitStripeMonitorEvent,
} from "../_shared/stripe-monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const envGetter = (key: string) => Deno.env.get(key) ?? null;
const stripePriceAllowlist = buildPriceAllowlist(envGetter);
const stripePriceTierMap = buildPriceTierMap(envGetter);

if (stripePriceAllowlist.size === 0 || stripePriceTierMap.size === 0) {
  console.error(JSON.stringify({ level: "error", message: "fix-subscription-sync missing Stripe price configuration" }));
  throw new Error("fix-subscription-sync configuration error: Stripe price IDs not set");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    console.log("Syncing subscription for user:", user.id);

    // Get Stripe subscription
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No subscription found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const priceId = subscription.items.data[0]?.price.id ?? null;
    const priceDecision = emitPriceGuardDecision(priceId, stripePriceAllowlist, {
      component: "fix-subscription-sync",
      action: "sync_subscription",
      correlationId: subscription.id,
    });

    if (!priceDecision.allowed) {
      console.error(JSON.stringify({ level: "error", message: "Unknown price id during sync", priceId }));
      throw new Error("Unknown price id for subscription");
    }

    const tier = resolveTierFromPriceMap(priceDecision.normalizedPriceId, stripePriceTierMap) || 'free';

    console.log("Stripe subscription:", {
      id: subscription.id,
      status: subscription.status,
      priceId,
      tier
    });

    // Update profile
    const updateData: any = {
      subscription_tier: tier,
      subscription_status: subscription.status,
      is_premium: tier !== 'free',
      subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
    };

    if (subscription.current_period_end) {
      updateData.subscription_ends_at = new Date(subscription.current_period_end * 1000).toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      emitStripeMonitorEvent({
        component: "fix-subscription-sync",
        event: "subscription_sync",
        severity: "error",
        metadata: {
          userId: user.id,
          stripeStatus: subscription.status,
          priceId: priceDecision.normalizedPriceId,
          error: updateError.message,
        },
      });
      throw updateError;
    }

    console.log("✅ Subscription synced successfully!");

    const telemetry = buildSubscriptionSyncTelemetry({
      component: "fix-subscription-sync",
      userId: user.id,
      stripeStatus: subscription.status,
      resolvedTier: tier,
      existingTier: profile?.subscription_tier ?? null,
      priceId: priceDecision.normalizedPriceId,
    });
    emitStripeMonitorEvent(telemetry);

    return new Response(
      JSON.stringify({
        success: true,
        tier,
        status: subscription.status,
        message: `Subscription synced: ${tier} (${subscription.status})`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
