import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    function: "activate-trial" 
  }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("info", "Trial activation request received");

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

    log("info", "User authenticated", { userId: user.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if trial already used
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("trial_used, trial_active")
      .eq("user_id", user.id)
      .single();

    if (profile?.trial_used) {
      log("warn", "Trial already used", { userId: user.id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "TRIAL_ALREADY_USED",
          messageKey: "trial.already_used",
          message: "You have already used your free trial" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        }
      );
    }

    // Activate trial using database function
    const { data: result, error: activateError } = await supabaseAdmin
      .rpc("activate_trial", { _user_id: user.id });

    if (activateError) {
      log("error", "Failed to activate trial", { error: activateError });
      throw activateError;
    }

    if (!result.success) {
      log("error", "Trial activation failed", { result });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error,
          message: "Failed to activate trial" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    log("info", "Trial activated successfully", { 
      userId: user.id, 
      trialEndsAt: result.trial_ends_at 
    });

    return new Response(
      JSON.stringify({
        success: true,
        trial_ends_at: result.trial_ends_at,
        trial_duration_days: result.trial_duration_days,
        message: "Trial activated successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Trial activation error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
