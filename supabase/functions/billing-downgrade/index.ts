import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isVipPriceId } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(JSON.stringify({ level, message, data, timestamp: new Date().toISOString() }));
};

const TIER_HIERARCHY = { free: 0, vip: 1 };

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

    log("info", "Downgrade request", { userId: user.id, targetPriceId });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();

    const targetTier = isVipPriceId(targetPriceId) ? "vip" : "free";
    const currentTier = profile?.subscription_tier || "free";

    // Validate downgrade (target tier must be lower than current)
    if (TIER_HIERARCHY[targetTier as keyof typeof TIER_HIERARCHY] >= TIER_HIERARCHY[currentTier as keyof typeof TIER_HIERARCHY]) {
      throw new Error("Target tier must be lower than current tier for downgrade");
    }

    // Insert downgrade request
    await supabaseAdmin
      .from("subscription_change_requests")
      .insert({
        user_id: user.id,
        target_price_id: targetPriceId,
        target_tier: targetTier,
        action: "downgrade",
        status: "pending",
      });

    log("info", "Downgrade scheduled", { userId: user.id, targetTier });

    return new Response(
      JSON.stringify({
        success: true,
        message: "downgrade_scheduled",
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
