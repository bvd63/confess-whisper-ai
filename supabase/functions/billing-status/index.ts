import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  createBillingPortalUrl,
  resolveSubscriptionLifecycleState,
} from "../_shared/subscription-lifecycle.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-connection-pool',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-STATUS] ${step}${detailsStr}`);
};

const getAppBaseUrl = (): string | null => {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) return null;
  return new URL(configuredUrl).origin;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      email: user.email,
      customerIdHint: null,
    });

    const appBaseUrl = getAppBaseUrl();
    const portalUrl = lifecycle.shouldUsePortal && appBaseUrl
      ? await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl: `${appBaseUrl}/profile`,
      }).catch(() => null)
      : null;

    if (lifecycle.category === "active_or_trialing") {
      return new Response(
        JSON.stringify({
          code: "ALREADY_SUBSCRIBED",
          subscription_status: lifecycle.subscriptionStatus,
          useCustomerPortal: true,
          portalUrl,
          recommendedAction: "OPEN_CUSTOMER_PORTAL",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    if (lifecycle.category === "payment_action_required") {
      return new Response(
        JSON.stringify({
          code: "PAYMENT_ACTION_REQUIRED",
          subscription_status: lifecycle.subscriptionStatus,
          useCustomerPortal: true,
          portalUrl,
          recommendedAction: "OPEN_CUSTOMER_PORTAL",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        code: "NEEDS_WEBHOOK_RECONCILIATION",
        subscription_status: lifecycle.subscriptionStatus,
        eligibleForCheckout: true,
        useCustomerPortal: false,
        portalUrl: null,
        recommendedAction: "START_CHECKOUT_AND_WAIT_FOR_WEBHOOK",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
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
