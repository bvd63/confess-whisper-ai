import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipPriceIds } from "../_shared/stripe-config.ts";
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
  console.log(`[BILLING-CHANGE] ${step}${detailsStr}`);
};

const getAppBaseUrl = (): string => {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }
  return new URL(configuredUrl).origin;
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

    if (!lifecycle.subscriptionId || lifecycle.category !== "active_or_trialing") {
      return new Response(
        JSON.stringify({ error: "No active subscription found", code: "NO_ACTIVE_SUBSCRIPTION" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }

    const subscription = await stripe.subscriptions.retrieve(lifecycle.subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;
    logStep("Found active subscription", {
      subscriptionId: subscription.id,
      customerId: lifecycle.customerId,
    });

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

    return new Response(
      JSON.stringify({ 
        success: true,
        applied: "webhook",
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
