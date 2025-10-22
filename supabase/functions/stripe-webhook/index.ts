import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map price IDs to tiers - using actual Stripe test price IDs
const PRICE_ID_TO_TIER: Record<string, string> = {
  // Premium prices
  'price_1SIVqFR7kygIyYg9Ai1tJ2AI': 'premium', // Premium monthly
  'price_1SIVqeR7kygIyYg9FizFMLRx': 'premium', // Premium yearly
  // VIP prices
  'price_1SL42cR7kygIyYg9LFEBp8uz': 'vip', // VIP monthly
  'price_1SL42zR7kygIyYg9IZrd2ExW': 'vip', // VIP yearly
};

const getTierFromPriceId = (priceId: string): string => {
  const tier = PRICE_ID_TO_TIER[priceId];
  if (tier) {
    logStep("Tier mapped from price ID", { priceId, tier });
    return tier;
  }
  logStep("Unknown price ID, defaulting to free", { priceId });
  return 'free';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook received", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate event
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_processed_events")
      .select("id")
      .eq("id", event.id)
      .single();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record event as processed
    await supabaseAdmin.from("stripe_processed_events").insert({
      id: event.id,
      type: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription") {
          const userId = session.metadata?.userId || session.metadata?.user_id || session.client_reference_id;
          
          if (!userId) {
            logStep("ERROR: No user ID in session", { sessionId: session.id, metadata: session.metadata });
            break;
          }
          
          logStep("Processing checkout session", { userId, sessionId: session.id });

          // Update profiles table with Stripe customer ID and provisional status
          if (session.customer) {
            await supabaseAdmin
              .from("profiles")
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                subscription_tier: "premium",
                subscription_status: "active",
              })
              .eq("user_id", userId);
            
            logStep("Profile updated with subscription info", { 
              userId, 
              customerId: session.customer,
              subscriptionId: session.subscription 
            });
          }

          logStep("Checkout completed", { userId, sessionId: session.id });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) break;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (!profile) {
          logStep("ERROR: Profile not found for customer", { customerId: invoice.customer });
          break;
        }
        
        logStep("Processing payment for user", { userId: profile.user_id, tier, priceId });

        // Update profiles table with subscription info
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: tier !== "free",
            subscription_tier: tier,
            subscription_status: "active",
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: subscriptionId,
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          logStep("ERROR updating profile", { error: updateError, userId: profile.user_id });
        }

        logStep("Payment succeeded - user benefits updated", { 
          userId: profile.user_id, 
          tier, 
          isPremium: tier !== 'free',
          subscriptionEnds: new Date(subscription.current_period_end * 1000).toISOString()
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        // Map Stripe status to our status
        let status: string;
        switch (subscription.status) {
          case "active":
          case "trialing":
            status = "active";
            break;
          case "past_due":
          case "unpaid":
            status = "past_due";
            break;
          case "canceled":
            status = "canceled";
            break;
          default:
            status = subscription.status;
        }

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();

        if (!profile) {
          logStep("ERROR: Profile not found for customer", { customerId: subscription.customer });
          break;
        }
        
        logStep("Processing subscription update", { userId: profile.user_id, tier, status, priceId });

        // Update profiles table
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: tier !== "free" && status === "active",
            subscription_tier: tier,
            subscription_status: status,
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: subscription.id,
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          logStep("ERROR updating profile", { error: updateError, userId: profile.user_id });
        }

        logStep("Subscription updated - user benefits updated", { 
          userId: profile.user_id, 
          tier, 
          status, 
          isPremium: tier !== 'free' && status === 'active',
          subscriptionEnds: new Date(subscription.current_period_end * 1000).toISOString()
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer as string)
          .single();

        if (!profile) {
          logStep("ERROR: Profile not found for customer", { customerId: subscription.customer });
          break;
        }
        
        logStep("Processing subscription deletion", { userId: profile.user_id });

        // Update profiles table
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: false,
            subscription_tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          logStep("ERROR updating profile", { error: updateError, userId: profile.user_id });
        }

        logStep("Subscription deleted - benefits removed", { userId: profile.user_id });
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (!profile) break;

        // Check for pending downgrade
        const { data: pendingDowngrade } = await supabaseAdmin
          .from("subscription_change_requests")
          .select("*")
          .eq("user_id", profile.user_id)
          .eq("status", "pending")
          .single();

        // Note: Downgrades would be handled here if subscription_change_requests table exists
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
