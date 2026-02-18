import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createStripeClient } from "../_shared/stripe.ts";
import { validateStripeWebhookEvent } from "../_shared/webhook-security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: any) => {
  console.log(
    JSON.stringify({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      function: "stripe-webhook-subscriptions",
    }),
  );
};

const VIP_ACTIVE_STATUSES = new Set(["active", "trialing"]);
const FREE_STATUSES = new Set(["canceled", "unpaid", "past_due", "incomplete", "incomplete_expired"]);

const toIsoFromUnix = (value: unknown): string | null => {
  if (typeof value !== "number") return null;
  return new Date(value * 1000).toISOString();
};

const toSubscriptionInterval = (value: unknown): "monthly" | "yearly" | null => {
  if (value === "month") return "monthly";
  if (value === "year") return "yearly";
  return null;
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

const shouldGrantVip = (subscription: any): boolean => {
  const status = String(subscription?.status ?? "");
  const currentPeriodEndUnix = typeof subscription?.current_period_end === "number"
    ? subscription.current_period_end
    : null;
  const hasPeriodEnded = currentPeriodEndUnix !== null && (currentPeriodEndUnix * 1000) <= Date.now();

  if (hasPeriodEnded) return false;
  if (FREE_STATUSES.has(status)) return false;
  if (VIP_ACTIVE_STATUSES.has(status)) return true;
  return false;
};

const resolveProfileByCustomer = async (
  supabase: any,
  stripe: any,
  payloadObject: any,
  customerId: string,
) => {
  const { data: profileByCustomer, error: customerLookupError } = await supabase
    .from("profiles")
    .select("user_id, email, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerLookupError) {
    log("error", "Failed lookup by stripe_customer_id", { customerId, error: customerLookupError.message });
    return null;
  }

  if (profileByCustomer) {
    return profileByCustomer;
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
        const { error: backfillError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", profileByStableRef.user_id)
          .is("stripe_customer_id", null);

        if (backfillError) {
          log("error", "Failed backfill stripe_customer_id from stable reference", {
            userId: profileByStableRef.user_id,
            customerId,
            error: backfillError.message,
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
      customerId,
      email: normalizedEmail,
      error: emailLookupError.message,
    });
    return null;
  }

  if (!profileByEmail) {
    return null;
  }

  if (!profileByEmail.stripe_customer_id) {
    const { error: backfillError } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", profileByEmail.user_id)
      .is("stripe_customer_id", null);

    if (backfillError) {
      log("error", "Failed backfill stripe_customer_id from email fallback", {
        userId: profileByEmail.user_id,
        customerId,
        error: backfillError.message,
      });
    }
  }

  return profileByEmail;
};

const updateProfileFromSubscription = async (
  supabase: any,
  profileUserId: string,
  customerId: string,
  subscription: any,
  sourceEventType: string,
) => {
  const status = String(subscription?.status ?? "unknown");
  const price = subscription?.items?.data?.[0]?.price;
  const priceId = typeof price?.id === "string" ? price.id : null;
  const interval = toSubscriptionInterval(price?.recurring?.interval);
  const grantVip = shouldGrantVip(subscription);

  const updatePayload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription?.id ?? null,
    subscription_tier: grantVip ? "vip" : "free",
    subscription_status: status,
    subscription_ends_at: toIsoFromUnix(subscription?.current_period_end),
    subscription_cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    subscription_price_id: priceId,
    subscription_interval: interval,
    is_premium: grantVip,
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", profileUserId);

  if (updateError) {
    log("error", "Profile subscription lifecycle update failed", {
      userId: profileUserId,
      customerId,
      subscriptionId: subscription?.id ?? null,
      status,
      sourceEventType,
      error: updateError.message,
    });
    return;
  }

  log("info", "Profile subscription lifecycle updated", {
    userId: profileUserId,
    customerId,
    subscriptionId: subscription?.id ?? null,
    status,
    tier: updatePayload.subscription_tier,
    cancelAtPeriodEnd: updatePayload.subscription_cancel_at_period_end,
    currentPeriodEnd: updatePayload.subscription_ends_at,
    priceId,
    interval,
    sourceEventType,
  });
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
      return new Response(JSON.stringify({ error: "INVALID_WEBHOOK_SIGNATURE" }), {
        status: validation.status,
        headers: corsHeaders,
      });
    }

    const event = validation.event;
    log("info", "Webhook event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: event.id });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        log("info", "Duplicate webhook event received; skipping side effects", { eventId: event.id, type: event.type });
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
      }

      log("error", "Failed to record webhook idempotency event", {
        eventId: event.id,
        type: event.type,
        error: idempotencyError.message,
      });
      return new Response(JSON.stringify({ received: false }), { status: 503, headers: corsHeaders });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerId = getCustomerIdFromObject(session);

        if (!customerId) {
          log("warn", "checkout.session.completed missing customer id", { eventId: event.id });
          break;
        }

        const profile = await resolveProfileByCustomer(supabase, stripe, session, customerId);
        if (!profile) {
          log("warn", "No profile found for checkout session customer", { customerId, eventId: event.id });
          break;
        }

        const subscriptionId = typeof session?.subscription === "string" ? session.subscription : null;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await updateProfileFromSubscription(supabase, profile.user_id, customerId, subscription, event.type);
          } catch (retrieveError) {
            log("error", "Failed to retrieve subscription after checkout completion", {
              eventId: event.id,
              customerId,
              subscriptionId,
              error: retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = getCustomerIdFromObject(subscription);

        if (!customerId) {
          log("warn", "Subscription event missing customer id", { eventId: event.id, type: event.type, subscriptionId: subscription?.id });
          break;
        }

        const profile = await resolveProfileByCustomer(supabase, stripe, subscription, customerId);
        if (!profile) {
          log("warn", "No profile found for subscription customer", { customerId, subscriptionId: subscription?.id });
          break;
        }

        await updateProfileFromSubscription(supabase, profile.user_id, customerId, subscription, event.type);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = getCustomerIdFromObject(invoice);

        if (!customerId) {
          log("warn", "invoice.paid missing customer id", { eventId: event.id });
          break;
        }

        const subscriptionId = typeof invoice?.subscription === "string" ? invoice.subscription : null;
        if (!subscriptionId) {
          log("info", "invoice.paid without subscription reference", { eventId: event.id, customerId });
          break;
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const profile = await resolveProfileByCustomer(supabase, stripe, invoice, customerId);
          if (!profile) {
            log("warn", "No profile found for invoice.paid customer", { customerId, subscriptionId });
            break;
          }

          await updateProfileFromSubscription(supabase, profile.user_id, customerId, subscription, event.type);
        } catch (retrieveError) {
          log("error", "Failed processing invoice.paid subscription refresh", {
            eventId: event.id,
            customerId,
            subscriptionId,
            error: retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = getCustomerIdFromObject(invoice);

        if (!customerId) {
          log("warn", "invoice.payment_failed missing customer id", { eventId: event.id });
          break;
        }

        const profile = await resolveProfileByCustomer(supabase, stripe, invoice, customerId);
        if (!profile) {
          log("warn", "No profile found for invoice.payment_failed customer", { customerId, eventId: event.id });
          break;
        }

        const { error: downgradeError } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            subscription_tier: "free",
            subscription_status: "past_due",
            is_premium: false,
          })
          .eq("user_id", profile.user_id);

        if (downgradeError) {
          log("error", "invoice.payment_failed downgrade failed", {
            customerId,
            userId: profile.user_id,
            error: downgradeError.message,
          });
        } else {
          log("info", "Profile downgraded to free after payment failure", {
            customerId,
            userId: profile.user_id,
          });
        }
        break;
      }

      default:
        log("info", "Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", "Webhook processing failed", { error: errorMessage });
    return new Response(JSON.stringify({ error: "WEBHOOK_PROCESSING_FAILED" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
