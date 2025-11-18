import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ 
    level, 
    message, 
    data, 
    timestamp: new Date().toISOString(),
    function: "subscription-downgrade" 
  }));
};

const envGetter = (key: string) => Deno.env.get(key) ?? null;
const stripePriceAllowlist = buildPriceAllowlist(envGetter);
const priceTierMap = buildPriceTierMap(envGetter);

if (stripePriceAllowlist.size === 0 || priceTierMap.size === 0) {
  console.error(JSON.stringify({
    level: "error",
    message: "subscription-downgrade missing Stripe price configuration",
  }));
  throw new Error("subscription-downgrade configuration error: Stripe price IDs not set");
}

const tierHierarchy: Record<string, number> = {
  free: 0,
  premium: 1,
  vip: 2,
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { targetPriceId } = await req.json();
    if (!targetPriceId) {
      throw new Error("targetPriceId is required");
    }

    if (!isAllowedPriceId(targetPriceId, stripePriceAllowlist)) {
      log("error", "Disallowed price id", { userId: user.id, targetPriceId });
      return new Response(
        JSON.stringify({ error: "invalid_price_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    log("info", "Downgrade request", { userId: user.id, targetPriceId });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's current tier from profiles (source of truth)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();

    const targetTier = resolveTierFromPriceMap(targetPriceId, priceTierMap);
    if (!targetTier) {
      log("error", "Unable to resolve tier for price", { targetPriceId });
      return new Response(
        JSON.stringify({ error: "unknown_price_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }
    const currentTier = profile?.subscription_tier || "free";

    log("info", "Comparing tiers", { currentTier, targetTier });

    // Validate it's actually a downgrade
    if (tierHierarchy[targetTier] >= tierHierarchy[currentTier]) {
      log("error", "Invalid downgrade target", { currentTier, targetTier });
      return new Response(
        JSON.stringify({ error: "invalid_target", message: `Cannot downgrade from ${currentTier} to ${targetTier}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if already on target tier
    if (currentTier === targetTier) {
      return new Response(
        JSON.stringify({ error: "already_on_plan", message: "Already on this plan" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create downgrade request
    await supabaseAdmin.from("subscription_change_requests").insert({
      user_id: user.id,
      target_price_id: targetPriceId,
      target_tier: targetTier,
      action: "downgrade",
      status: "pending",
    });

    // Log audit
    await supabaseAdmin.from("subscription_audit").insert({
      user_id: user.id,
      action: "downgrade_scheduled",
      data: { target_tier: targetTier, current_tier: currentTier, price_id: targetPriceId },
    });

    log("info", "Downgrade scheduled", { userId: user.id, targetTier, currentTier });

    return new Response(
      JSON.stringify({
        success: true,
        message: "downgrade_scheduled",
        target_tier: targetTier,
        current_tier: currentTier,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Downgrade error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
