import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipMonthlyPriceId } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    console.log(`[TRIAL-CHECKOUT] User ${user.id} requesting VIP trial`);

    // Check trial eligibility
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_premium_used, subscription_tier, is_premium")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Block if trial already used
    if (profile.trial_premium_used) {
      console.log(`[TRIAL-CHECKOUT] User ${user.id} already used trial`);
      return new Response(
        JSON.stringify({ 
          error: "TRIAL_ALREADY_USED",
          message: "You've already used your VIP trial"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Block if already subscribed
    if (profile.subscription_tier !== 'free' || profile.is_premium) {
      console.log(`[TRIAL-CHECKOUT] User ${user.id} already has subscription`);
      return new Response(
        JSON.stringify({ 
          error: "ALREADY_SUBSCRIBED",
          message: "You already have an active subscription"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get VIP price ID - ALWAYS use VIP for trial
    const vipPriceId = getVipMonthlyPriceId();

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create Stripe checkout session with 3-day trial
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{
        price: vipPriceId,
        quantity: 1,
      }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          appTier: "VIP",
          userId: user.id,
        },
      },
      payment_method_collection: "always",
      allow_promotion_codes: false,
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/payment-canceled`,
    });

    // Mark trial as used and set timestamps
    const trialStartsAt = new Date();
    const trialEndsAt = new Date(trialStartsAt.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        trial_premium_used: true,
        trial_premium_started_at: trialStartsAt.toISOString(),
        trial_premium_ends_at: trialEndsAt.toISOString(),
        subscription_tier: "vip",
        is_premium: true,
        trial_active: true,
        trial_end_date: trialEndsAt.toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    console.log(`[TRIAL-CHECKOUT] VIP trial activated for user ${user.id} until ${trialEndsAt.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        trialEndsAt: trialEndsAt.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[TRIAL-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
