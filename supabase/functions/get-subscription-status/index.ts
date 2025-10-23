import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    console.log(`[SUBSCRIPTION-STATUS] Checking status for user ${user.id}`);

    // Get profile with trial info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, trial_premium_used, trial_premium_started_at, trial_premium_ends_at, trial_active, trial_end_date, is_premium")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Check if on active trial
    const now = new Date();
    const trialEndsAt = profile.trial_premium_ends_at ? new Date(profile.trial_premium_ends_at) : null;
    const onTrial = profile.trial_active && trialEndsAt && trialEndsAt > now;

    // Determine trial eligibility
    const trialEligible = !profile.trial_premium_used && 
                          profile.subscription_tier === 'free' && 
                          !profile.is_premium;

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check Stripe for active subscription
    let stripeSubscription = null;
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeSubscription = subscriptions.data[0];
      }
    }

    // Determine final tier
    let tier = profile.subscription_tier || 'free';
    if (onTrial) {
      tier = 'premium'; // During trial, treat as premium
    } else if (stripeSubscription) {
      const priceId = stripeSubscription.items.data[0]?.price.id;
      const premiumMonthly = "price_1SJ0vvR7kygIyYg9oT1ju6lQ";
      const premiumYearly = "price_1SJ0vvR7kygIyYg9yORadPGD";
      const vipMonthly = "price_1SJ0vwR7kygIyYg9OeCiqV00";
      const vipYearly = "price_1SJ0vvR7kygIyYg9BJuciYGd";
      
      if (priceId === premiumMonthly || priceId === premiumYearly) {
        tier = 'premium';
      } else if (priceId === vipMonthly || priceId === vipYearly) {
        tier = 'vip';
      }
    }

    // Get payment method info
    let paymentMethodLast4 = null;
    if (stripeSubscription) {
      const paymentMethodId = stripeSubscription.default_payment_method;
      if (paymentMethodId && typeof paymentMethodId === 'string') {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (paymentMethod.card) {
          paymentMethodLast4 = paymentMethod.card.last4;
        }
      }
    }

    const response = {
      tier,
      isTrial: onTrial, // Match expected field name
      trialEnd: trialEndsAt?.toISOString() || null, // Match expected field name
      currentPeriodEnd: stripeSubscription?.current_period_end 
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString() 
        : null, // Match expected field name
      cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
      paymentMethodLast4,
      trialEligible, // Keep for other components
    };

    console.log(`[SUBSCRIPTION-STATUS] User ${user.id} status:`, response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[SUBSCRIPTION-STATUS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
