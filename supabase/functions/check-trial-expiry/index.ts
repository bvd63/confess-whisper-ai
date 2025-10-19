import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    console.log(`[CHECK-TRIAL-EXPIRY] Checking trial for user ${user.id}`);

    // Get user's trial status
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_active, trial_end_date, subscription_tier")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Check if trial is active but expired
    if (profile.trial_active && profile.trial_end_date) {
      const trialEndDate = new Date(profile.trial_end_date);
      const now = new Date();

      if (now > trialEndDate) {
        console.log(`[CHECK-TRIAL-EXPIRY] Trial expired for user ${user.id}, reverting to free`);
        
        // Revert to free tier
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            trial_active: false,
            subscription_tier: "free",
            is_premium: false
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ 
            trialExpired: true,
            message: "Trial expired, reverted to free tier"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        trialExpired: false,
        trialActive: profile.trial_active,
        message: "Trial status checked"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[CHECK-TRIAL-EXPIRY] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});