import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AWARD-SUBSCRIPTION-COINS] ${step}${detailsStr}`);
};

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

    const { userId, tier, isFirstCharge } = await req.json();
    
    if (!userId || !tier || isFirstCharge === undefined) {
      throw new Error("Missing required parameters");
    }

    if (!isFirstCharge) {
      logStep("Not first charge, skipping coin award");
      return new Response(JSON.stringify({ success: true, awarded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Processing first charge", { userId, tier });

    // Check if coins already awarded for this tier
    const { data: existingTransaction } = await supabaseClient
      .from('coin_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', `subscription_${tier}_bonus`)
      .maybeSingle();

    if (existingTransaction) {
      logStep("Coins already awarded for this tier");
      return new Response(JSON.stringify({ success: true, awarded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Award coins based on tier
    const coinAmounts = {
      premium: 100,
      vip: 250
    };

    const coinsToAward = coinAmounts[tier as keyof typeof coinAmounts] || 0;
    
    if (coinsToAward === 0) {
      throw new Error("Invalid tier for coin award");
    }

    // Use the award_coins function
    const { error: awardError } = await supabaseClient.rpc('award_coins', {
      _user_id: userId,
      _amount: coinsToAward,
      _type: `subscription_${tier}_bonus`,
      _description: `Welcome bonus for activating ${tier} subscription`
    });

    if (awardError) throw awardError;

    logStep("Coins awarded successfully", { amount: coinsToAward });

    return new Response(JSON.stringify({ 
      success: true, 
      awarded: true, 
      amount: coinsToAward 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
