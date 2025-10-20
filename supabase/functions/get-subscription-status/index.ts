import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(level: string, message: string, context?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', '[GET-SUBSCRIPTION-STATUS] Function started');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    log('info', '[GET-SUBSCRIPTION-STATUS] User authenticated', { userId: user.id });

    // Check profile for trial status
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier, trial_active, trial_end_date')
      .eq('user_id', user.id)
      .single();

    const trialValid = profile?.trial_active && profile?.trial_end_date && new Date(profile.trial_end_date) > new Date();

    // If on trial, return trial status
    if (trialValid) {
      log('info', '[GET-SUBSCRIPTION-STATUS] User on trial');
      return new Response(JSON.stringify({
        tier: 'premium',
        isTrial: true,
        currentPeriodEnd: null,
        trialEnd: profile.trial_end_date,
        cancelAtPeriodEnd: false,
        paymentMethodLast4: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      log('info', '[GET-SUBSCRIPTION-STATUS] No customer found, user is free');
      return new Response(JSON.stringify({
        tier: 'free',
        isTrial: false,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethodLast4: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      log('info', '[GET-SUBSCRIPTION-STATUS] No subscription found');
      return new Response(JSON.stringify({
        tier: 'free',
        isTrial: false,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethodLast4: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    
    // Determine tier from price
    let tier = 'free';
    if (priceId.includes('premium')) tier = 'premium';
    if (priceId.includes('vip')) tier = 'vip';

    // Get payment method
    let paymentMethodLast4 = null;
    if (subscription.default_payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(subscription.default_payment_method as string);
        paymentMethodLast4 = pm.card?.last4 || null;
      } catch (e) {
        log('warn', '[GET-SUBSCRIPTION-STATUS] Could not retrieve payment method');
      }
    }

    log('info', '[GET-SUBSCRIPTION-STATUS] Subscription found', { tier, status: subscription.status });

    return new Response(JSON.stringify({
      tier: subscription.status === 'active' ? tier : 'free',
      isTrial: false,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      trialEnd: null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      paymentMethodLast4,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', '[GET-SUBSCRIPTION-STATUS] Error occurred', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
