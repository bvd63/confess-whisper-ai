import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  createBillingPortalUrl,
  resolveSubscriptionLifecycleState,
} from "../_shared/subscription-lifecycle.ts";

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

    // Validate auth header early to avoid "missing sub claim" runtime errors
    const authHeader = req.headers.get("Authorization")?.trim();
    if (!authHeader || authHeader === "Bearer" || authHeader === "Bearer null" || authHeader === "Bearer undefined") {
      logStep("Missing or invalid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized: missing or invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "").trim();
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Authentication error", { message: userError.message });
      return new Response(JSON.stringify({ error: `Authentication error: ${userError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    if (!user?.email || !user.id) {
      logStep("User missing email or id");
      return new Response(JSON.stringify({ error: "Unauthorized: user not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const appBaseUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
    const returnUrl = appBaseUrl ? `${new URL(appBaseUrl).origin}/profile` : null;

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      supabase: supabaseClient,
      profileUserId: user.id,
      profileEmail: user.email,
      customerIdHint: null,
    });

    const portalUrl = lifecycle.shouldUsePortal && returnUrl
      ? await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl,
      }).catch(() => null)
      : null;

    if (lifecycle.category === "active_or_trialing") {
      return new Response(JSON.stringify({
        subscribed: true,
        code: "ALREADY_SUBSCRIBED",
        subscription_status: lifecycle.subscriptionStatus,
        useCustomerPortal: true,
        portalUrl,
        recommendedAction: "OPEN_CUSTOMER_PORTAL",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (lifecycle.category === "payment_action_required") {
      return new Response(JSON.stringify({
        subscribed: false,
        code: "PAYMENT_ACTION_REQUIRED",
        subscription_status: lifecycle.subscriptionStatus,
        useCustomerPortal: true,
        portalUrl,
        recommendedAction: "OPEN_CUSTOMER_PORTAL",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      subscribed: false,
      code: "NEEDS_WEBHOOK_RECONCILIATION",
      subscription_status: lifecycle.subscriptionStatus,
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
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
