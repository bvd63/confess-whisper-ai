import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_ID_TO_TIER: Record<string, string> = {
  'price_1SIVqFR7kygIyYg9Ai1tJ2AI': 'premium',
  'price_1SIVqeR7kygIyYg9FizFMLRx': 'premium',
  'price_1SL42cR7kygIyYg9LFEBp8uz': 'vip',
  'price_1SL42zR7kygIyYg9IZrd2ExW': 'vip',
};

const getTierFromPriceId = (priceId: string): string => {
  return PRICE_ID_TO_TIER[priceId] || 'free';
};

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
      .select("stripe_subscription_id, stripe_customer_id")
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
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getTierFromPriceId(priceId);

    console.log("Stripe subscription:", {
      id: subscription.id,
      status: subscription.status,
      priceId,
      tier
    });

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        is_premium: tier !== 'free',
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("✅ Subscription synced successfully!");

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
