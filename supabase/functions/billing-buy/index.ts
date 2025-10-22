import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SIVqFR7kygIyYg9Ai1tJ2AI",
  premium_yearly: "price_1SIVqeR7kygIyYg9FizFMLRx",
  vip_monthly: "price_1SL42cR7kygIyYg9LFEBp8uz",
  vip_yearly: "price_1SL42zR7kygIyYg9IZrd2ExW",
};

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
    
    if (!tier || !['premium', 'vip'].includes(tier)) {
      throw new Error("Invalid tier. Must be 'premium' or 'vip'");
    }

    const priceId = STRIPE_PRICE_IDS[`${tier}_${cycle}` as keyof typeof STRIPE_PRICE_IDS];
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

    const origin = req.headers.get("origin") || "http://localhost:8080";
    
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
