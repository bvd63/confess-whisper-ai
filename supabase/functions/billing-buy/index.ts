import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getVipPriceIds } from "../_shared/stripe-config.ts";

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

const VIP_PRICE_IDS = getVipPriceIds();

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', '[BILLING-BUY] Function started', { requestId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log('error', '[BILLING-BUY] Missing Stripe key', { requestId });
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "unknown";
    log('info', '[BILLING-BUY] Stripe mode detected', { requestId, stripeMode });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('warn', '[BILLING-BUY] No authorization header', { requestId });
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      log('error', '[BILLING-BUY] Authentication failed', { requestId, error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      log('warn', '[BILLING-BUY] User not authenticated', { requestId });
      throw new Error("User not authenticated or email not available");
    }
    log('info', '[BILLING-BUY] User authenticated', { requestId, userId: user.id });

    const { tier, cycle = 'monthly' } = await req.json();
    
    if (!tier || tier !== 'vip') {
      throw new Error("Invalid tier. Must be 'vip'");
    }

    const priceId = cycle === 'yearly' ? VIP_PRICE_IDS.yearly : VIP_PRICE_IDS.monthly;
    if (!priceId) {
      throw new Error("Invalid price ID for selected tier and cycle");
    }

    log('info', '[BILLING-BUY] Creating checkout session', { requestId, tier, cycle, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      log('info', '[BILLING-BUY] Existing customer found', { requestId, customerId });
      
      // Check for active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        log('warn', '[BILLING-BUY] User already has active subscription', { requestId });
        throw new Error("You already have an active subscription. Please manage it instead.");
      }
    }

    const origin = getAppBaseUrl();
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        tier,
        cycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    });

    log('info', '[BILLING-BUY] Checkout session created', { requestId, sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', '[BILLING-BUY] Error occurred', { requestId, error: errorMessage });

    // Detect Stripe live/test mode mismatch
    const isMismatch = errorMessage.includes("exist in live mode") || errorMessage.includes("No such price") || errorMessage.includes("resource_missing");
    if (isMismatch) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
      const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : "test";
      log('error', '[BILLING-BUY] Stripe mode mismatch suspected', { requestId, stripeMode });
      return new Response(JSON.stringify({
        error: `Stripe mode mismatch: your STRIPE_SECRET_KEY is in ${stripeMode} mode but the price ID belongs to the other mode. Set STRIPE_SECRET_KEY to sk_live_... to use LIVE prices.`,
        code: "STRIPE_MODE_MISMATCH",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
