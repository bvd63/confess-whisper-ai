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

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function log(level: string, message: string, context?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

function getAppBaseUrl(): string {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }
  return new URL(configuredUrl).origin;
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', '[CUSTOMER-PORTAL] Function started', { requestId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log('error', '[CUSTOMER-PORTAL] Missing Stripe key', { requestId });
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('warn', '[CUSTOMER-PORTAL] No authorization header', { requestId });
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      log('error', '[CUSTOMER-PORTAL] Authentication failed', { requestId, error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      log('warn', '[CUSTOMER-PORTAL] User not authenticated', { requestId });
      throw new Error("User not authenticated or email not available");
    }
    log('info', '[CUSTOMER-PORTAL] User authenticated', { requestId, userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      email: user.email,
      customerIdHint: null,
    });
    let customerId = lifecycle.customerId;
    if (!customerId) {
      log('warn', '[CUSTOMER-PORTAL] No customer found, creating one', { requestId, email: user.email });
      const created = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = created.id;
      log('info', '[CUSTOMER-PORTAL] Customer created', { requestId, customerId });
    } else {
      log('info', '[CUSTOMER-PORTAL] Customer found', { requestId, customerId });
    }

    const origin = getAppBaseUrl();
    const portalUrl = await createBillingPortalUrl({
      stripe,
      customerId,
      returnUrl: `${origin}/profile`,
    });
    if (!portalUrl) {
      throw new Error("Failed to create billing portal session");
    }
    log('info', '[CUSTOMER-PORTAL] Portal session created', { requestId, customerId });

    return new Response(JSON.stringify({ url: portalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', '[CUSTOMER-PORTAL] Error occurred', { requestId, error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
