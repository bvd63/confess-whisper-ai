import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildPriceAllowlist,
  buildPriceTierMap,
  isAllowedPriceId,
  resolveTierFromPriceMap,
} from "../_shared/stripe-price-allowlist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${detailsStr}`);
};

const readPrice = (primary: string, legacy: string) => Deno.env.get(primary) ?? Deno.env.get(legacy) ?? "";

const PRICE_IDS = {
  premium: readPrice("PRICE_PREMIUM_MONTHLY", "STRIPE_PRICE_PREMIUM_MONTHLY"),
  vip: readPrice("PRICE_VIP_MONTHLY", "STRIPE_PRICE_VIP_MONTHLY"),
};

const envGetter = (key: string) => Deno.env.get(key) ?? null;
const stripePriceAllowlist = buildPriceAllowlist(envGetter);
const stripePriceTierMap = buildPriceTierMap(envGetter);

const missingPrices = Object.entries(PRICE_IDS).filter(([_, value]) => !isAllowedPriceId(value, stripePriceAllowlist));

if (stripePriceAllowlist.size === 0 || stripePriceTierMap.size === 0 || missingPrices.length > 0) {
  console.error(JSON.stringify({
    level: "error",
    message: "manage-subscription missing Stripe price configuration",
    missingPriceKeys: missingPrices.map(([key]) => key),
  }));
  throw new Error("manage-subscription configuration error: Stripe price IDs not set");
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { action, newTier } = await req.json();
    if (!action || !['cancel', 'upgrade', 'downgrade'].includes(action)) {
      throw new Error("Invalid action specified");
    }
    logStep("Action requested", { action, newTier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    logStep("Active subscription found", { subscriptionId: subscription.id });

    if (action === 'cancel') {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      await supabaseClient
        .from('profiles')
        .update({ subscription_cancel_at_period_end: true })
        .eq('user_id', user.id);

      logStep("Subscription cancelled at period end");

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Subscription will cancel at period end" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'upgrade' || action === 'downgrade') {
      if (!newTier || !['premium', 'vip'].includes(newTier)) {
        throw new Error("Invalid tier for upgrade/downgrade");
      }

      const newPriceId = PRICE_IDS[newTier as keyof typeof PRICE_IDS];
      if (!isAllowedPriceId(newPriceId, stripePriceAllowlist)) {
        throw new Error(`Price ID not configured for ${newTier}`);
      }

      const resolvedTier = resolveTierFromPriceMap(newPriceId, stripePriceTierMap);
      if (!resolvedTier) {
        throw new Error("Unable to resolve tier for price");
      }

      // Update subscription
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
      });

      await supabaseClient
        .from('profiles')
        .update({ subscription_tier: resolvedTier })
        .eq('user_id', user.id);

      logStep("Subscription updated", { newTier: resolvedTier });

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Subscription ${action}d to ${resolvedTier}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Unhandled action");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
