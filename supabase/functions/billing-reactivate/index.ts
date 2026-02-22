import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isVipPriceId } from "../_shared/stripe-config.ts";
import {
  createBillingPortalUrl,
  getManageLifecycleBlock,
  resolveSubscriptionLifecycleState,
} from "../_shared/subscription-lifecycle.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-REACTIVATE] ${step}${detailsStr}`);
};

const getAppBaseUrl = (): string => {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }
  return new URL(configuredUrl).origin;
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
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      email: user.email,
      customerIdHint: profile?.stripe_customer_id ?? null,
    });
    const lifecycleBlock = getManageLifecycleBlock(lifecycle);
    if (lifecycleBlock) {
      const portalUrl = await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl: `${getAppBaseUrl()}/profile`,
      }).catch(() => null);

      return new Response(
        JSON.stringify({
          error: lifecycleBlock.message,
          code: lifecycleBlock.code,
          subscriptionStatus: lifecycle.subscriptionStatus,
          useCustomerPortal: lifecycleBlock.requiresPortal,
          portalUrl,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: lifecycleBlock.status,
        },
      );
    }

    if (!lifecycle.customerId || !lifecycle.subscriptionId) {
      throw new Error("No subscription found to reactivate");
    }

    const customerId = lifecycle.customerId;
    const subscription = await stripe.subscriptions.retrieve(lifecycle.subscriptionId);
    logStep("Found subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    let updatedSubscription;

    if (subscription.status === 'active' && subscription.cancel_at_period_end) {
      // Subscription is active but set to cancel - just remove the cancellation
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
      });
      logStep("Removed cancellation from active subscription");
    } else if (subscription.status === 'canceled') {
      // Check if within grace period (let's say 7 days)
      const canceledAt = subscription.canceled_at ? subscription.canceled_at * 1000 : 0;
      const daysSinceCanceled = (Date.now() - canceledAt) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCanceled > 7) {
        throw new Error("Subscription canceled too long ago. Please create a new subscription.");
      }

      // Get the last price used
      const lastPrice = subscription.items.data[0].price.id;
      
      // Create new subscription with same price
      updatedSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: lastPrice }],
      });
      logStep("Created new subscription", { subscriptionId: updatedSubscription.id });
    } else {
      throw new Error("Subscription is not in a state that can be reactivated");
    }

    const priceId = updatedSubscription.items.data[0].price.id;
    const tier = isVipPriceId(priceId) ? "vip" : "free";
    logStep("Reactivation sent to Stripe, awaiting webhook reconciliation", {
      subscriptionId: updatedSubscription.id,
      tier,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        applied: "webhook",
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_tier: tier,
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
