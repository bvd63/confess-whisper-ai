import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-MANAGE] ${step}${detailsStr}`);
};

const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",
  premium_yearly: "price_1SJ0vvR7kygIyYg9yORadPGD",
  vip_monthly: "price_1SJ0vwR7kygIyYg9OeCiqV00",
  vip_yearly: "price_1SJ0vvR7kygIyYg9BJuciYGd",
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

    const { action, priceId, prorationBehavior, effective } = await req.json();
    logStep("Request details", { action, priceId, prorationBehavior, effective });

    if (!action || !['change', 'cancel', 'reactivate', 'status'].includes(action)) {
      throw new Error("Invalid action. Must be: change, cancel, reactivate, or status");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length === 0) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    } else {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Get subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    const subscription = subscriptions.data.length > 0 ? subscriptions.data[0] : null;
    logStep("Subscription status", { 
      hasSubscription: !!subscription,
      status: subscription?.status,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end
    });

    // Handle different actions
    switch (action) {
      case 'status': {
        if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
          return new Response(
            JSON.stringify({
              currentPlan: 'free',
              status: 'none',
              interval: null,
              cancelAtPeriodEnd: false,
              canReactivate: subscription?.status === 'canceled' && subscription.cancel_at_period_end
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        const currentPriceId = subscription.items.data[0].price.id;
        const currentPrice = subscription.items.data[0].price;
        let currentPlan = 'premium';
        const interval = currentPrice.recurring?.interval === 'year' ? 'yearly' : 'monthly';
        
        // Determine tier
        if (currentPriceId === STRIPE_PRICE_IDS.vip_monthly || currentPriceId === STRIPE_PRICE_IDS.vip_yearly) {
          currentPlan = 'vip';
        }

        return new Response(
          JSON.stringify({
            currentPlan,
            interval,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            canReactivate: subscription.cancel_at_period_end,
            priceId: currentPriceId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'change': {
        if (!priceId) throw new Error("priceId required for change action");
        
        if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
          throw new Error("No active subscription to change");
        }

        const subscriptionItemId = subscription.items.data[0].id;
        const currentPriceId = subscription.items.data[0].price.id;
        
        if (currentPriceId === priceId) {
          throw new Error("Already subscribed to this plan");
        }

        logStep("Changing subscription", { 
          from: currentPriceId, 
          to: priceId,
          prorationBehavior: prorationBehavior || 'create_prorations'
        });

        const updateParams: any = {
          items: [{
            id: subscriptionItemId,
            price: priceId,
          }],
          proration_behavior: prorationBehavior || 'create_prorations',
        };

        // If downgrade and effective is period_end, schedule the change
        if (effective === 'period_end') {
          updateParams.proration_behavior = 'none';
          updateParams.billing_cycle_anchor = 'unchanged';
        }

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, updateParams);
        
        logStep("Subscription changed", { subscriptionId: updatedSubscription.id });

        // Determine new tier
        let newTier = 'premium';
        const newInterval = updatedSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
        
        if (priceId === STRIPE_PRICE_IDS.vip_monthly || priceId === STRIPE_PRICE_IDS.vip_yearly) {
          newTier = 'vip';
        }

        // Update profile
        await supabaseClient
          .from('profiles')
          .update({
            current_plan: newTier,
            last_sync_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({
            success: true,
            subscription: {
              id: updatedSubscription.id,
              currentPlan: newTier,
              interval: newInterval,
              status: updatedSubscription.status,
              currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'cancel': {
        if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
          throw new Error("No active subscription to cancel");
        }

        const when = effective || 'period_end';
        logStep("Canceling subscription", { when });

        if (when === 'now') {
          const canceledSubscription = await stripe.subscriptions.cancel(subscription.id);
          
          await supabaseClient
            .from('profiles')
            .update({
              current_plan: 'free',
              last_sync_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          return new Response(
            JSON.stringify({
              success: true,
              canceledImmediately: true,
              subscription: {
                id: canceledSubscription.id,
                status: canceledSubscription.status,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } else {
          const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
          });

          return new Response(
            JSON.stringify({
              success: true,
              canceledImmediately: false,
              endsAt: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
              subscription: {
                id: updatedSubscription.id,
                status: updatedSubscription.status,
                cancelAtPeriodEnd: true,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }

      case 'reactivate': {
        if (!subscription) {
          throw new Error("No subscription found to reactivate");
        }

        if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
          throw new Error("Subscription is already active");
        }

        logStep("Reactivating subscription");

        if (subscription.cancel_at_period_end) {
          // Remove cancellation
          const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: false,
          });

          const priceId = updatedSubscription.items.data[0].price.id;
          let tier = 'premium';
          if (priceId === STRIPE_PRICE_IDS.vip_monthly || priceId === STRIPE_PRICE_IDS.vip_yearly) {
            tier = 'vip';
          }

          await supabaseClient
            .from('profiles')
            .update({
              current_plan: tier,
              last_sync_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          return new Response(
            JSON.stringify({
              success: true,
              subscription: {
                id: updatedSubscription.id,
                currentPlan: tier,
                status: updatedSubscription.status,
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } else {
          throw new Error("Cannot reactivate this subscription. Please create a new subscription.");
        }
      }

      default:
        throw new Error("Invalid action");
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
