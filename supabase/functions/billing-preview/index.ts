import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { ensureStripeCustomerId } from "../_shared/subscription-lifecycle.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-PREVIEW] ${step}${detailsStr}`);
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
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { targetPriceId } = await req.json();
    if (!targetPriceId) {
      throw new Error("Target price ID is required");
    }

    logStep("Preview request", { targetPriceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) {
      throw new Error(`Failed to load profile: ${profileError.message}`);
    }

    const customerId = await ensureStripeCustomerId({
      stripe,
      supabase: supabaseClient,
      profileUserId: user.id,
      profileEmail: user.email,
      customerIdHint: profile?.stripe_customer_id ?? null,
    });
    logStep("Resolved customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;
    
    logStep("Current subscription", { 
      subscriptionId: subscription.id, 
      currentPriceId,
      currentPeriodEnd: subscription.current_period_end 
    });

    // Preview the upcoming invoice with the new price
    const upcomingInvoice = await stripe.invoices.upcoming({
      customer: customerId,
      subscription: subscription.id,
      subscription_items: [{
        id: subscriptionItemId,
        price: targetPriceId,
      }],
      subscription_proration_behavior: 'create_prorations',
    });

    logStep("Preview invoice retrieved", { 
      amountDue: upcomingInvoice.amount_due,
      currency: upcomingInvoice.currency 
    });

    // Calculate proration details
    const prorationAmount = upcomingInvoice.lines.data
      .filter((line: any) => line.proration)
      .reduce((sum: number, line: any) => sum + line.amount, 0);

    const response = {
      success: true,
      preview: {
        amountDue: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        prorationAmount,
        subtotal: upcomingInvoice.subtotal,
        total: upcomingInvoice.total,
        periodEnd: subscription.current_period_end,
        lines: upcomingInvoice.lines.data.map((line: any) => ({
          description: line.description,
          amount: line.amount,
          proration: line.proration,
        })),
      }
    };

    logStep("Preview calculated successfully");

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
