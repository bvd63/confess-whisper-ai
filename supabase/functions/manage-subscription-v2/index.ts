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

function log(level: string, message: string, context?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

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
    
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { action } = body as { action?: string };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      email: user.email,
      customerIdHint: null,
    });
    const portalUrl = lifecycle.shouldUsePortal
      ? await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl: `${getAppBaseUrl()}/profile`,
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
    log('error', '[MANAGE-SUBSCRIPTION-V2] Error occurred', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
