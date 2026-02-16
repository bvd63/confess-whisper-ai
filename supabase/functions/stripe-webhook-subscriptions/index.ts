import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createStripeClient } from "../_shared/stripe.ts";
import { validateStripeWebhookEvent } from "../_shared/webhook-security.ts";

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
    function: "stripe-webhook-subscriptions" 
  }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripe = createStripeClient(Deno.env.get("STRIPE_SECRET_KEY") || "");
    const validation = await validateStripeWebhookEvent({
      signature,
      webhookSecret,
      rawBody: body,
      constructEvent: (raw, sig, secret) => stripe.webhooks.constructEvent(raw, sig, secret),
    });
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: validation.status,
        headers: corsHeaders,
      });
    }
    const event = validation.event;

    log("info", "Webhook event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;
        
        log("info", "Processing subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted || !customer.email) {
          log("warn", "Customer deleted or no email", { customerId });
          return new Response(JSON.stringify({ received: true }), { 
            status: 200, 
            headers: corsHeaders 
          });
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", customer.email)
          .single();

        if (!profile) {
          log("warn", "No profile found for customer", { email: customer.email, customerId });
          return new Response(JSON.stringify({ received: true }), { 
            status: 200, 
            headers: corsHeaders 
          });
        }

        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceId?.includes("vip") ? "vip" : "free";

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_tier: tier,
            subscription_status: subscription.status,
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          log("error", "Profile update failed", { userId: profile.user_id, error: updateError.message });
        } else {
          log("info", "Profile updated", { userId: profile.user_id, tier, status: subscription.status });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        log("info", "Subscription deleted", { subscriptionId: subscription.id, customerId });

        const { error: downgradeError } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_ends_at: null,
          })
          .eq("stripe_customer_id", customerId);

        if (downgradeError) {
          log("error", "Downgrade to free failed", { customerId, error: downgradeError.message });
        } else {
          log("info", "Profile downgraded to free", { customerId });
        }
        break;
      }

      default:
        log("info", "Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: corsHeaders 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Webhook processing failed", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
});
