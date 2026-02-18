import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipPriceIds } from "../_shared/stripe-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-CHANGE] ${step}${detailsStr}`);
};

// Shared helper keeps monthly/yearly IDs in sync across environments
const STRIPE_PRICE_IDS = getVipPriceIds();

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

    const { targetTier, cycle } = await req.json();
    if (!targetTier || targetTier !== 'vip') {
      throw new Error("Invalid target tier - only VIP is supported");
    }
    if (!cycle || !['monthly', 'yearly'].includes(cycle)) {
      throw new Error("Invalid cycle - must be monthly or yearly");
    }

    logStep("Target tier and cycle", { targetTier, cycle });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    const subscriptionItemId = subscription.items.data[0].id;
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Get target price ID based on cycle
    const targetPriceId = cycle === 'yearly'
      ? STRIPE_PRICE_IDS.yearly
      : STRIPE_PRICE_IDS.monthly;
    if (!targetPriceId) {
      throw new Error(`Price ID for VIP ${cycle} not configured in environment`);
    }

    logStep("Changing subscription", { targetPriceId });

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscriptionItemId,
        price: targetPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    logStep("Subscription updated", { subscriptionId: updatedSubscription.id });

    // Update local database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        current_plan: targetTier,
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      logStep("Database update error", { error: updateError });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: updatedSubscription.id,
          current_tier: targetTier,
          current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        }
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
