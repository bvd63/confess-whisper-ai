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

// Stripe price IDs - Loaded from environment secrets
const PRICE_IDS = {
  premium_monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") || "",
  premium_yearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") || "",
  vip_monthly: Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") || "",
  vip_yearly: Deno.env.get("STRIPE_PRICE_VIP_YEARLY") || "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', '[MANAGE-SUBSCRIPTION-V2] Function started');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    log('info', '[MANAGE-SUBSCRIPTION-V2] User authenticated', { userId: user.id });

    const body = await req.json();
    const { action, targetTier, when } = body;
    
    log('info', '[MANAGE-SUBSCRIPTION-V2] Action requested', { action, targetTier, when });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Handle trial cancellation
    if (action === 'cancel_now') {
      log('info', '[MANAGE-SUBSCRIPTION-V2] Canceling trial immediately');
      
      await supabaseClient
        .from('profiles')
        .update({
          trial_active: false,
          subscription_tier: 'free',
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        message: "Trial canceled successfully",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For all other actions, need to check if user is on trial first
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('trial_active, trial_premium_ends_at')
      .eq('user_id', user.id)
      .single();

    // Check if on active trial
    if (profile?.trial_active && profile?.trial_premium_ends_at) {
      const trialEndsAt = new Date(profile.trial_premium_ends_at);
      if (trialEndsAt > new Date()) {
        return new Response(JSON.stringify({
          error: "Cannot modify trial subscription. Please wait until trial ends or cancel it first.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // For all other actions, need Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        error: "No Stripe customer found. Please subscribe first.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const customerId = customers.data[0].id;
    log('info', '[MANAGE-SUBSCRIPTION-V2] Customer found', { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({
        error: "No active subscription found. Please subscribe first.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const subscription = subscriptions.data[0];
    const currentItem = subscription.items.data[0];
    
    log('info', '[MANAGE-SUBSCRIPTION-V2] Current subscription', { 
      subscriptionId: subscription.id,
      currentPrice: currentItem.price.id 
    });

    // Handle actions
    if (action === 'upgrade' || action === 'downgrade') {
      // Determine target price
      const currentInterval = currentItem.price.recurring?.interval || 'month';
      let targetPrice: string;
      
      if (targetTier === 'vip') {
        targetPrice = currentInterval === 'year' ? PRICE_IDS.vip_yearly : PRICE_IDS.vip_monthly;
      } else {
        targetPrice = currentInterval === 'year' ? PRICE_IDS.premium_yearly : PRICE_IDS.premium_monthly;
      }

      log('info', '[MANAGE-SUBSCRIPTION-V2] Changing plan', { targetPrice });

      await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: currentItem.id,
            price: targetPrice,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: targetTier,
        })
        .eq('user_id', user.id);

      log('info', '[MANAGE-SUBSCRIPTION-V2] Plan changed successfully');

      return new Response(JSON.stringify({
        message: action === 'upgrade' ? "Upgraded successfully" : "Downgraded successfully",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'cancel') {
      log('info', '[MANAGE-SUBSCRIPTION-V2] Canceling at period end');
      
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: true,
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        message: "Subscription will cancel at period end",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'reactivate') {
      log('info', '[MANAGE-SUBSCRIPTION-V2] Reactivating subscription');
      
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
      });

      await supabaseClient
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: false,
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        message: "Subscription reactivated successfully",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', '[MANAGE-SUBSCRIPTION-V2] Error occurred', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
