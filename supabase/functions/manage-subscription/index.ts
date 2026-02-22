import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  createBillingPortalUrl,
  resolveSubscriptionLifecycleState,
} from "../_shared/subscription-lifecycle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${detailsStr}`);
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { action } = await req.json().catch(() => ({ action: null }));
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const appBaseUrl = getAppBaseUrl();

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      supabase: supabaseClient,
      profileUserId: user.id,
      profileEmail: user.email,
      customerIdHint: null,
    });
    const portalUrl = lifecycle.shouldUsePortal
      ? await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl: `${appBaseUrl}/profile`,
      }).catch(() => null)
      : null;

    if (lifecycle.category === "active_or_trialing") {
      return new Response(JSON.stringify({
        success: false,
        code: "ALREADY_SUBSCRIBED",
        subscriptionStatus: lifecycle.subscriptionStatus,
        requestedAction: action ?? null,
        useCustomerPortal: true,
        portalUrl,
        recommendedAction: "OPEN_CUSTOMER_PORTAL",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    if (lifecycle.category === "payment_action_required") {
      return new Response(JSON.stringify({
        success: false,
        code: "PAYMENT_ACTION_REQUIRED",
        subscriptionStatus: lifecycle.subscriptionStatus,
        requestedAction: action ?? null,
        useCustomerPortal: true,
        portalUrl,
        recommendedAction: "OPEN_CUSTOMER_PORTAL",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Legacy endpoint is now read-only: entitlements are webhook-driven only.
    return new Response(JSON.stringify({
      success: false,
      code: "NEEDS_WEBHOOK_RECONCILIATION",
      subscriptionStatus: lifecycle.subscriptionStatus,
      requestedAction: action ?? null,
      eligibleForCheckout: true,
      useCustomerPortal: false,
      portalUrl: null,
      recommendedAction: "START_CHECKOUT_AND_WAIT_FOR_WEBHOOK",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
