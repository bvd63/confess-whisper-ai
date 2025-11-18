import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID required");

    logStep("Checking session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    
    logStep("Session retrieved", { 
      status: session.payment_status,
      subscriptionId: session.subscription 
    });

    // Check if payment was successful and subscription was created
    if (session.payment_status === 'paid' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;

      logStep("Retrieving subscription details", { subscriptionId });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      // Determine tier based on price ID
      let tier = 'free';
      let cadence = 'monthly';
      
      const monthlyPriceId = Deno.env.get('VITE_STRIPE_PRICE_VIP_MONTH_ID');
      const yearlyPriceId = Deno.env.get('VITE_STRIPE_PRICE_VIP_YEAR_ID');

      if (priceId === monthlyPriceId) {
        tier = 'vip';
        cadence = 'monthly';
      } else if (priceId === yearlyPriceId) {
        tier = 'vip';
        cadence = 'yearly';
      }

      logStep("Updating profile", { tier, cadence, subscriptionId });

      // Update user profile with subscription info
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_cadence: cadence,
          subscription_status: subscription.status,
          subscription_ends_at: currentPeriodEnd,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          is_premium: tier === 'vip',
        })
        .eq('user_id', user.id);

      if (updateError) {
        logStep("Error updating profile", { error: updateError });
        throw updateError;
      }

      logStep("Profile updated successfully");

      return new Response(
        JSON.stringify({ 
          success: true,
          tier,
          cadence,
          subscriptionEnd: currentPeriodEnd
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      logStep("Payment not completed or no subscription", { 
        status: session.payment_status,
        hasSubscription: !!session.subscription 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});