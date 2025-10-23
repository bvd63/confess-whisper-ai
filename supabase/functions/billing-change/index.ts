// @ts-expect-error - Deno runtime imports
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-expect-error - Deno runtime imports
import Stripe from "https://esm.sh/stripe@18.5.0";
// @ts-expect-error - Deno runtime imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-CHANGE] ${step}${detailsStr}`);
};

const STRIPE_PRICE_IDS = {
  premium: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",
  vip: "price_1SJ0vwR7kygIyYg9OeCiqV00",
};

serve(async (req: Request) => {
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

    const { targetTier } = await req.json();
    if (!targetTier || !['premium', 'vip'].includes(targetTier)) {
      throw new Error("Invalid target tier");
    }

    logStep("Target tier", { targetTier });

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
    const currentPriceId = subscription.items.data[0].price.id;
    logStep("Found active subscription", { subscriptionId: subscription.id, currentPriceId });

    // Determine current tier from price ID
    let currentTier: 'premium' | 'vip' | 'free' = 'free';
    for (const [key, val] of Object.entries(STRIPE_PRICE_IDS)) {
      if (val === currentPriceId) {
        currentTier = key as 'premium' | 'vip';
        break;
      }
    }

    // Validate tier hierarchy for proper upgrade/downgrade
    const tierHierarchy: Record<string, number> = { free: 0, premium: 1, vip: 2 };
    const currentLevel = tierHierarchy[currentTier];
    const targetLevel = tierHierarchy[targetTier];

    // Edge case validation
    if (currentLevel === 0) {
      throw new Error("Cannot change subscription from free tier. Please create a new subscription instead.");
    }

    if (targetLevel === 0) {
      throw new Error("Cannot downgrade to free tier. Please cancel your subscription instead.");
    }

    if (currentLevel === targetLevel) {
      throw new Error("You are already on this plan.");
    }

    // Get target price ID from centralized config
    const targetPriceId = STRIPE_PRICE_IDS[targetTier as keyof typeof STRIPE_PRICE_IDS];
    if (!targetPriceId) {
      throw new Error(`Price ID for ${targetTier} not configured`);
    }

    // Determine if upgrade or downgrade for proper proration handling
    const isUpgrade = targetLevel > currentLevel;
    logStep("Changing subscription", { 
      targetPriceId, 
      isUpgrade,
      from: currentTier,
      to: targetTier 
    });

    // Update subscription with appropriate proration
    // Upgrades: immediate with proration
    // Downgrades: at period end (no immediate proration)
    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [{
        id: subscriptionItemId,
        price: targetPriceId,
      }],
      proration_behavior: isUpgrade ? 'create_prorations' : 'none',
    };

    if (!isUpgrade) {
      // For downgrades, maintain the billing cycle
      updateParams.billing_cycle_anchor = 'unchanged';
    }

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, updateParams);

    logStep("Subscription updated", { subscriptionId: updatedSubscription.id });

    // Update local database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        current_plan: targetTier,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', user.id);

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
