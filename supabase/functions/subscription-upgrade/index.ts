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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ 
    level, 
    message, 
    data, 
    timestamp: new Date().toISOString(),
    function: "subscription-upgrade" 
  }));
};

const getAppBaseUrl = (): string => {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }
  return new URL(configuredUrl).origin;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { targetPriceId } = await req.json();
    if (!targetPriceId) {
      throw new Error("targetPriceId is required");
    }
    if (!isVipPriceId(targetPriceId)) {
      throw new Error("Invalid target price for upgrade");
    }

    log("info", "Upgrade request", { userId: user.id, targetPriceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      email: user.email ?? null,
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
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(lifecycle.subscriptionId);
    const currentItemId = subscription.items.data[0].id;

    // Update subscription with immediate proration
    const updatedSubscription = await stripe.subscriptions.update(lifecycle.subscriptionId, {
      items: [
        {
          id: currentItemId,
          price: targetPriceId,
        },
      ],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "now",
    });

    log("info", "Upgrade sent to Stripe, awaiting webhook reconciliation", {
      userId: user.id,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "upgrade_processing",
        applied: "webhook",
        subscriptionStatus: updatedSubscription.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Upgrade error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
