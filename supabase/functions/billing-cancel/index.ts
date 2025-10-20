import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-CANCEL] ${step}${detailsStr}`);
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

    const { immediate } = await req.json();
    const isImmediate = immediate === true;

    logStep("Cancel type", { immediate: isImmediate });

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
    logStep("Found active subscription", { subscriptionId: subscription.id });

    let updatedSubscription;
    if (isImmediate) {
      // Cancel immediately
      updatedSubscription = await stripe.subscriptions.cancel(subscription.id);
      logStep("Subscription canceled immediately", { subscriptionId: subscription.id });
      
      // Update local database
      await supabaseClient
        .from('profiles')
        .update({
          current_plan: 'free',
          status: 'canceled',
          cancel_at_period_end: false,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } else {
      // Cancel at period end
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      logStep("Subscription set to cancel at period end", { 
        subscriptionId: subscription.id,
        periodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      });

      // Update local database
      await supabaseClient
        .from('profiles')
        .update({
          cancel_at_period_end: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: updatedSubscription.id,
          canceled: true,
          immediate: isImmediate,
          current_period_end: updatedSubscription.current_period_end 
            ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
            : null,
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
