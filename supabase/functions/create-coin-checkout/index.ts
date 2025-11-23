import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z, validateJsonBody, buildJsonResponse } from "../_shared/validation.ts";
import { createFunctionLogger } from "../_shared/logger.ts";
import {
  createCoinCheckoutSession,
  createCoinCheckoutRepositories,
  createStripeService,
} from "./service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
  const logger = createFunctionLogger("create-coin-checkout", requestId);

  if (req.method === "OPTIONS") {
    logger.debug("CORS preflight received");
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logger.info("Function invoked");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logger.error("STRIPE_SECRET_KEY not configured");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logger.debug("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.warn("Missing authorization header");
      return buildJsonResponse({ error: "UNAUTHORIZED", message: "Missing authorization header" }, 401, corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logger.info("User authenticated", { userId: user.id, email: user.email });

    const validationResult = await validateJsonBody({
      req,
      schema: z.object({
        packageId: z.string().min(1, "Package ID is required"),
      }),
      corsHeaders,
      logger,
      errorCode: "INVALID_PACKAGE",
      message: "Package ID is required",
      messageKey: "coins.package_required",
    });

    if (!validationResult.success) {
      return validationResult.response;
    }

    const { packageId } = validationResult.data;
    logger.debug("Package ID received", { packageId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const repositories = createCoinCheckoutRepositories(supabaseClient as unknown as any);
    const stripeService = createStripeService(stripe);

    const origin = req.headers.get("origin") || "";
    
    // Create one-time payment session for coins
    const session = await createCoinCheckoutSession(
      {
        repositories,
        stripe: stripeService,
        logger,
      },
      {
        packageId,
        userId: user.id,
        userEmail: user.email,
        origin,
      },
    );

    logger.info("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("create-coin-checkout failed", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});