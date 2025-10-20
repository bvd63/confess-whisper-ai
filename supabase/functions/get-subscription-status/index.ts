import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, context?: any) => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` - ${JSON.stringify(context)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("info", "get-subscription-status function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    log("info", "Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    log("info", "Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    log("info", "User authenticated", { userId: user.id, email: user.email });

    // Check for active trial in profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('trial_active, trial_end_date, subscription_tier, subscription_cancel_at_period_end')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      log("error", "Profile fetch error", { error: profileError.message });
    }

    // If trial is active and valid
    if (profile?.trial_active && profile.trial_end_date) {
      const trialEnd = new Date(profile.trial_end_date);
      if (trialEnd > new Date()) {
        log("info", "Active trial found", { trialEnd: profile.trial_end_date });
        return new Response(JSON.stringify({
          tier: 'premium',
          isTrial: true,
          trialEnd: profile.trial_end_date,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          paymentMethodLast4: null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Check Stripe for subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      log("info", "No Stripe customer found - returning free tier");
      return new Response(JSON.stringify({
        tier: 'free',
        isTrial: false,
        trialEnd: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethodLast4: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    log("info", "Stripe customer found", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      log("info", "No active subscription found");
      return new Response(JSON.stringify({
        tier: profile?.subscription_tier || 'free',
        isTrial: false,
        trialEnd: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: profile?.subscription_cancel_at_period_end || false,
        paymentMethodLast4: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    
    // Map price ID to tier
    let tier = 'premium';
    if (priceId.includes('vip')) {
      tier = 'vip';
    }

    log("info", "Active subscription found", { 
      subscriptionId: subscription.id, 
      tier,
      currentPeriodEnd: subscription.current_period_end 
    });

    // Get payment method details
    let paymentMethodLast4 = null;
    if (subscription.default_payment_method) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          subscription.default_payment_method as string
        );
        paymentMethodLast4 = paymentMethod.card?.last4 || null;
      } catch (error) {
        log("warn", "Could not retrieve payment method", { error });
      }
    }

    return new Response(JSON.stringify({
      tier,
      isTrial: false,
      trialEnd: null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      paymentMethodLast4
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Error in get-subscription-status", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
