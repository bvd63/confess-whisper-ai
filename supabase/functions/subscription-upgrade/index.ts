import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ 
    level, 
    message, 
    data, 
    timestamp: new Date().toISOString(),
    function: "subscription-upgrade" 
  }));
};

// Map price IDs to tiers - only VIP supported (no Premium)
const PRICE_ID_TO_TIER: Record<string, "vip"> = {
  [Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") || ""]: "vip",
  [Deno.env.get("STRIPE_PRICE_VIP_YEARLY") || ""]: "vip",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { targetPriceId } = await req.json();
    if (!targetPriceId) {
      throw new Error("targetPriceId is required");
    }

    log("info", "Upgrade request", { userId: user.id, targetPriceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const currentItemId = subscription.items.data[0].id;

    // Update subscription with immediate proration
    const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [
        {
          id: currentItemId,
          price: targetPriceId,
        },
      ],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "now",
    });

    // Ensure we have a valid current_period_end (some API responses may omit it on immediate proration)
    const refreshedSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const periodEnd = refreshedSubscription.current_period_end || updatedSubscription.current_period_end || null;

    const newTier = PRICE_ID_TO_TIER[targetPriceId] || "vip";

    // Update profiles table
    await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: true,
        subscription_tier: newTier,
        subscription_status: "active",
        subscription_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("user_id", user.id);

    log("info", "Upgrade successful", { userId: user.id, newTier });

    return new Response(
      JSON.stringify({
        success: true,
        message: "upgrade_processing",
        tier: newTier,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Upgrade error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
