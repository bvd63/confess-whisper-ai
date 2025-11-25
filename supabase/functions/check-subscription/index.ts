import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isVipPriceId } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-connection-pool",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // First check for trial status in profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('trial_premium_ends_at, trial_active, subscription_tier, is_premium, subscription_ends_at, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
    }
    
    // Check if user has active trial (map to VIP for backwards compatibility)
    if (profile?.trial_premium_ends_at) {
      const trialEndDate = new Date(profile.trial_premium_ends_at);
      const now = new Date();
      
      if (now < trialEndDate) {
        logStep("User has active trial", { endsAt: trialEndDate.toISOString() });
        
        // Map trial to VIP tier
        await supabaseClient
          .from('profiles')
          .update({ 
            subscription_tier: 'vip',
            is_premium: true,
            trial_active: true
          })
          .eq('user_id', user.id);
        
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_tier: 'vip',
          subscription_end: trialEndDate.toISOString(),
          onTrial: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      
      // Update profile to free tier
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          is_premium: false,
          subscription_ends_at: null,
          stripe_subscription_id: null
        })
        .eq('user_id', user.id);
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Update profile with Stripe customer ID
    await supabaseClient
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let subscriptionTier = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const endEpoch = (subscription as any)?.current_period_end;
      subscriptionEnd = typeof endEpoch === 'number' && !Number.isNaN(endEpoch)
        ? new Date(endEpoch * 1000).toISOString()
        : null;
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Map price IDs to tiers - dynamically built from environment
      const priceId = subscription.items.data[0]?.price.id as string | undefined;
      if (priceId && isVipPriceId(priceId)) {
        subscriptionTier = 'vip';
      } else {
        subscriptionTier = subscription.metadata?.plan_name?.toLowerCase() || 'vip';
      }
      logStep("Determined subscription tier", { priceId, tier: subscriptionTier });
      
      // Update profile with subscription info
      await supabaseClient
        .from('profiles')
        .update({ 
          is_premium: true,
          subscription_tier: subscriptionTier,
          subscription_ends_at: subscriptionEnd,
          stripe_subscription_id: subscription.id
        })
        .eq('user_id', user.id);
    } else {
      logStep("No active subscription found");
      
      // Only update to free if not on trial
      if (!profile?.trial_premium_ends_at || new Date(profile.trial_premium_ends_at) < new Date()) {
        await supabaseClient
          .from('profiles')
          .update({ 
            subscription_tier: 'free',
            is_premium: false,
            subscription_ends_at: null,
            stripe_subscription_id: null,
            trial_active: false
          })
          .eq('user_id', user.id);
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
