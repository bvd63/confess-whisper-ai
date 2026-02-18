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

const getCustomerIdFromObject = (payloadObject: any): string | null => {
  if (!payloadObject?.customer) return null;
  if (typeof payloadObject.customer === "string") return payloadObject.customer;
  if (typeof payloadObject.customer?.id === "string") return payloadObject.customer.id;
  return null;
};

const getStableUserReference = (payloadObject: any): string | null => {
  const metadataUserId = payloadObject?.metadata?.user_id ?? payloadObject?.metadata?.supabase_user_id;
  if (typeof metadataUserId === "string" && metadataUserId.trim()) {
    return metadataUserId.trim();
  }

  if (typeof payloadObject?.client_reference_id === "string" && payloadObject.client_reference_id.trim()) {
    return payloadObject.client_reference_id.trim();
  }

  return null;
};

const resolveProfileByCustomer = async (
  supabase: any,
  stripe: any,
  payloadObject: any,
  customerId: string,
) => {
  const { data: existingProfileByCustomer, error: customerLookupError } = await supabase
    .from("profiles")
    .select("user_id, email, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerLookupError) {
    log("error", "Failed lookup by stripe_customer_id", { customerId, error: customerLookupError.message });
    return null;
  }

  if (existingProfileByCustomer) {
    return existingProfileByCustomer;
  }

  const stableUserId = getStableUserReference(payloadObject);
  if (stableUserId) {
    const { data: profileByStableRef, error: stableRefLookupError } = await supabase
      .from("profiles")
      .select("user_id, email, stripe_customer_id")
      .eq("user_id", stableUserId)
      .maybeSingle();

    if (stableRefLookupError) {
      log("error", "Failed lookup by stable user reference", { stableUserId, error: stableRefLookupError.message });
      return null;
    }

    if (profileByStableRef) {
      if (!profileByStableRef.stripe_customer_id) {
        const { error: backfillStableRefError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", profileByStableRef.user_id)
          .is("stripe_customer_id", null);

        if (backfillStableRefError) {
          log("error", "Failed backfill stripe_customer_id from stable reference", {
            userId: profileByStableRef.user_id,
            customerId,
            error: backfillStableRefError.message,
          });
        }
      }

      return profileByStableRef;
    }
  }

  let customerEmail = typeof payloadObject?.customer_email === "string" ? payloadObject.customer_email : null;
  if (!customerEmail) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && typeof customer.email === "string") {
        customerEmail = customer.email;
      }
    } catch (customerFetchError) {
      log("error", "Failed to retrieve Stripe customer for fallback email lookup", {
        customerId,
        error: customerFetchError instanceof Error ? customerFetchError.message : String(customerFetchError),
      });
      return null;
    }
  }

  if (!customerEmail) {
    return null;
  }

  const normalizedEmail = customerEmail.toLowerCase();
  const { data: profileByEmail, error: emailLookupError } = await supabase
    .from("profiles")
    .select("user_id, email, stripe_customer_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (emailLookupError) {
    log("error", "Failed fallback lookup by exact lowercase email", {
      email: normalizedEmail,
      customerId,
      error: emailLookupError.message,
    });
    return null;
  }

  if (!profileByEmail) {
    return null;
  }

  if (!profileByEmail.stripe_customer_id) {
    const { error: fallbackBackfillError } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", profileByEmail.user_id)
      .is("stripe_customer_id", null);

    if (fallbackBackfillError) {
      log("error", "Failed backfill stripe_customer_id from email fallback", {
        userId: profileByEmail.user_id,
        customerId,
        error: fallbackBackfillError.message,
      });
    }
  }

  return profileByEmail;
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

    const { error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: event.id });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        log("info", "Duplicate webhook event received; skipping side effects", { eventId: event.id, type: event.type });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      log("error", "Failed to record webhook idempotency event", {
        eventId: event.id,
        type: event.type,
        error: idempotencyError.message,
      });
      return new Response(JSON.stringify({ received: false }), {
        status: 503,
        headers: corsHeaders,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerId = getCustomerIdFromObject(session);

        if (!customerId) {
          log("warn", "checkout.session.completed missing customer id", { eventId: event.id });
          break;
        }

        await resolveProfileByCustomer(supabase, stripe, session, customerId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = getCustomerIdFromObject(subscription);

        if (!customerId) {
          log("warn", "Subscription event missing customer id", { eventId: event.id, type: event.type, subscriptionId: subscription?.id });
          break;
        }
        
        log("info", "Processing subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        const profile = await resolveProfileByCustomer(supabase, stripe, subscription, customerId);

        if (!profile) {
          log("warn", "No profile found for subscription customer", { customerId, subscriptionId: subscription.id });
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
        const customerId = getCustomerIdFromObject(subscription);

        if (!customerId) {
          log("warn", "Subscription deleted missing customer id", { eventId: event.id, subscriptionId: subscription?.id });
          break;
        }

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
    return new Response(JSON.stringify({ error: "WEBHOOK_PROCESSING_FAILED" }), {
      status: 400,
      headers: corsHeaders 
    });
  }
});
