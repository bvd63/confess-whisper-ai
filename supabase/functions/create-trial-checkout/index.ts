import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipMonthlyPriceId } from "../_shared/stripe-config.ts";
import { ensureStripeCustomerId } from "../_shared/subscription-lifecycle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resolveAppBaseUrl = (): string => {
  const configuredUrl = (
    Deno.env.get("APP_URL")
      ?? Deno.env.get("NEXT_PUBLIC_APP_URL")
      ?? Deno.env.get("VITE_APP_URL")
      ?? Deno.env.get("PUBLIC_APP_URL")
      ?? ""
  ).trim();

  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }

  const parsed = new URL(configuredUrl);
  return `${parsed.protocol}//${parsed.host}`;
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
      .select("trial_used, trial_premium_used, subscription_tier, is_premium, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Block if trial already used
    if (profile.trial_used || profile.trial_premium_used) {
      console.log(`[TRIAL-CHECKOUT] User ${user.id} already used trial`);
      return new Response(
        JSON.stringify({ 
          error: "TRIAL_ALREADY_USED",
          messageKey: "trial.already_used",
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

    const customerId = await ensureStripeCustomerId({
      stripe,
      supabase: supabaseClient,
      profileUserId: user.id,
      profileEmail: user.email ?? null,
      customerIdHint: profile?.stripe_customer_id ?? null,
    });

    // Create Stripe checkout session with 3-day trial.
    // Never trust request Origin for redirect URLs in billing flows.
    const appBaseUrl = resolveAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
          user_id: user.id,
        },
      },
      metadata: {
        user_id: user.id,
        trial_checkout: "true",
      },
      payment_method_collection: "always",
      allow_promotion_codes: false,
      success_url: `${appBaseUrl}/payment-success`,
      cancel_url: `${appBaseUrl}/payment-canceled`,
    });

    // Entitlements are granted only after Stripe lifecycle confirmation (webhook/verification).
    console.log(`[TRIAL-CHECKOUT] Trial checkout session created for user ${user.id}: ${session.id}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        trialStartsAfterCheckout: true,
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
