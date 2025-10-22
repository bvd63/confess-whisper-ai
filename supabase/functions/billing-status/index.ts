import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-STATUS] ${step}${detailsStr}`);
};

// Price IDs for both test and live mode
const STRIPE_PRICE_IDS = {
  premium_live: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",
  premium_yearly_live: "price_1SJ0vvR7kygIyYg9yORadPGD",
  vip_live: "price_1SJ0vwR7kygIyYg9OeCiqV00",
  vip_yearly_live: "price_1SJ0vvR7kygIyYg9BJuciYGd",
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(
        JSON.stringify({ 
          current_plan: 'free',
          status: 'none',
          cancel_at_period_end: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscriptions found");
      
      // Update local database - use correct column names
      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'none',
          subscription_cancel_at_period_end: false,
          stripe_customer_id: customerId,
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ 
          subscription_tier: 'free',
          subscription_status: 'none',
          cancel_at_period_end: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const subscription = subscriptions.data[0];
    logStep("Found subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status
    });

    // Determine tier from price - check product name from metadata
    const priceId = subscription.items.data[0].price.id;
    const productId = subscription.items.data[0].price.product;
    
    let tier = 'free';
    
    // Check if VIP or Premium based on price ID patterns or product metadata
    // Since we're using dynamic prices in test mode, check the subscription metadata
    const planName = subscription.metadata?.plan_name?.toLowerCase() || '';
    
    if (planName.includes('vip')) {
      tier = 'vip';
    } else if (planName.includes('premium')) {
      tier = 'premium';
    } else {
      // Fallback: check live mode price IDs
      if (Object.values(STRIPE_PRICE_IDS).includes(priceId)) {
        if (priceId.includes('vip') || priceId === STRIPE_PRICE_IDS.vip_live || priceId === STRIPE_PRICE_IDS.vip_yearly_live) {
          tier = 'vip';
        } else {
          tier = 'premium';
        }
      }
    }

    // If subscription is not active, set to free
    if (!['active', 'trialing'].includes(subscription.status)) {
      tier = 'free';
    }

    logStep("Determined tier", { tier, status: subscription.status, planName, priceId });

    // Update local database with correct column names
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        subscription_cancel_at_period_end: subscription.cancel_at_period_end,
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      })
      .eq('user_id', user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError });
    } else {
      logStep("Profile updated successfully", { tier });
    }

    return new Response(
      JSON.stringify({ 
        subscription_tier: tier,
        subscription_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscription.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
