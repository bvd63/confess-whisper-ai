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

    console.log(`[ACTIVATE-TRIAL] User ${user.id} requesting trial`);

    // Check if user already had a trial
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_active, trial_end_date, subscription_tier")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;

    // Check if trial was already used
    if (profile.trial_end_date) {
      console.log(`[ACTIVATE-TRIAL] User ${user.id} already used trial`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Trial already used",
          alreadyUsed: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Activate trial for 3 days
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        trial_active: true,
        trial_end_date: trialEndDate.toISOString(),
        subscription_tier: "premium",
        is_premium: true
      })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    console.log(`[ACTIVATE-TRIAL] Trial activated for user ${user.id} until ${trialEndDate.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        trialEndDate: trialEndDate.toISOString(),
        message: "Premium trial activated"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    } catch (error) {
      console.error("[ACTIVATE-TRIAL] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
});