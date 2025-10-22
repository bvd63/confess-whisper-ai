import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ level, message, data, timestamp: new Date().toISOString() }));
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

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      throw new Error("session_id parameter is required");
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

    log("info", "Billing confirmation request", { userId: user.id, sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      log("info", "Payment not yet completed", { sessionId, status: session.payment_status });
      return new Response(
        JSON.stringify({
          processing: true,
          status: session.payment_status,
          message: "payment_processing",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check current entitlements
    const { data: entitlement } = await supabaseAdmin
      .from("subscription_entitlements")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (entitlement && entitlement.status === "active") {
      log("info", "Entitlements already active", { userId: user.id });
      return new Response(
        JSON.stringify({
          processing: false,
          active: true,
          tier: entitlement.tier,
          message: "subscription_active",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Still processing
    log("info", "Still processing entitlements", { userId: user.id });
    return new Response(
      JSON.stringify({
        processing: true,
        message: "entitlements_processing",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Billing confirmation error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
