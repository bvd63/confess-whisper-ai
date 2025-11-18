import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COIN-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID required");

    logStep("Checking session", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    logStep("Session retrieved", { 
      status: session.payment_status,
      customerId: session.customer 
    });

    // Check if payment was successful
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.user_id;
      const coins = parseInt(session.metadata?.coins || '0');

      if (!userId || !coins) {
        throw new Error('Missing metadata in session');
      }

      logStep("Payment successful, checking if coins already awarded", { userId, coins });

      // Check if coins were already awarded by looking for existing transaction
      const { data: existingTransaction, error: checkError } = await supabaseClient
        .from('coin_transactions')
        .select('id, amount')
        .eq('user_id', userId)
        .like('description', `%Session: ${sessionId}%`)
        .limit(1)
        .maybeSingle();

      if (checkError) {
        logStep("Error checking for duplicate", { error: checkError });
      }

      if (existingTransaction) {
        logStep("Coins already awarded", { transactionId: existingTransaction.id });
        return new Response(
          JSON.stringify({ 
            success: true, 
            alreadyAwarded: true,
            coins 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Award coins if not already awarded
      logStep("Awarding coins", { coins });
      const { data: awardResult, error: awardError } = await supabaseClient.rpc('award_coins', {
        p_user_id: userId,
        p_amount: coins,
        p_session_id: sessionId,
        p_description: `Purchased ${coins} coins`
      });

      if (awardError) {
        logStep("Error awarding coins", { error: awardError });
        throw awardError;
      }

      logStep("Coins awarded successfully", { result: awardResult });

      return new Response(
        JSON.stringify({ 
          success: true, 
          awarded: true,
          coins 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});