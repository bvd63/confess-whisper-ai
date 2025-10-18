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

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    log('info', '[CREATE-CHECKOUT] Function started', { requestId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('warn', '[CREATE-CHECKOUT] No authorization header', { requestId });
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      log('warn', '[CREATE-CHECKOUT] User not authenticated', { requestId });
      throw new Error("User not authenticated or email not available");
    }
    log('info', '[CREATE-CHECKOUT] User authenticated', { requestId, userId: user.id });

    const { priceId, planName, billingCycle } = await req.json();
    log('info', '[CREATE-CHECKOUT] Request parsed', { requestId, priceId, planName, billingCycle });
    
    if (!priceId || typeof priceId !== 'string') {
      log('warn', '[CREATE-CHECKOUT] Invalid price ID', { requestId, priceId });
      throw new Error("Valid Price ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      log('info', '[CREATE-CHECKOUT] Existing customer found', { requestId, customerId });
    } else {
      log('info', '[CREATE-CHECKOUT] Will create customer on checkout', { requestId });
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
      metadata: {
        user_id: user.id,
        plan_name: planName || 'unknown',
        billing_cycle: billingCycle || 'monthly'
      },
    });

    log('info', '[CREATE-CHECKOUT] Session created successfully', { requestId, sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', '[CREATE-CHECKOUT] Error occurred', { requestId, error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});