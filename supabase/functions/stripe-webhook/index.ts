import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  resolveTier,
  deriveCadence,
  buildSubscriptionRecord,
  isDuplicateEventError,
  shouldAwardBonus,
  VIP_BONUS_AMOUNT,
  VIP_BONUS_DESCRIPTION,
  VIP_BONUS_TYPE,
  type SubscriptionTier,
} from "./utils.ts";

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_VIP_MONTHLY",
  "STRIPE_PRICE_VIP_YEARLY",
];

const missingEnv = REQUIRED_ENV.filter((key) => !Deno.env.get(key));
if (missingEnv.length > 0) {
  console.error(JSON.stringify({ level: "error", msg: "Missing required env vars", missingEnv }));
  throw new Error(`stripe-webhook configuration error: missing ${missingEnv.join(", ")}`);
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const log = (payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ level: "info", source: "stripe-webhook", ...payload }));
};

const logError = (payload: Record<string, unknown>) => {
  console.error(JSON.stringify({ level: "error", source: "stripe-webhook", ...payload }));
};

type StripeSubscription = Stripe.Subscription;

const priceConfig = {
  vipMonthly: Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") ?? null,
  vipYearly: Deno.env.get("STRIPE_PRICE_VIP_YEARLY") ?? null,
  premiumMonthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? null,
  premiumYearly: Deno.env.get("STRIPE_PRICE_PREMIUM_YEARLY") ?? null,
};

const extractUserId = async (supabase: SupabaseClient, customerId: string): Promise<string | null> => {
  const { data: subscriptionMatch, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (subscriptionError) {
    logError({ msg: "Failed to query subscriptions", customerId, error: subscriptionError.message });
    return null;
  }

  if (subscriptionMatch?.user_id) return subscriptionMatch.user_id as string;

  const { data: profileMatch, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profileError) {
    logError({ msg: "Failed to query profiles for customer", customerId, error: profileError.message });
    return null;
  }

  return (profileMatch?.user_id as string) ?? null;
};

const upsertSubscription = async (
  supabase: SupabaseClient,
  eventType: string,
  subscription: StripeSubscription,
) => {
    const price = subscription.items?.data?.[0]?.price;
    const priceId = price?.id as string | undefined;
    const cadence = deriveCadence(price?.recurring?.interval ?? null);
    const tier = resolveTier(priceId, priceConfig);

    const customerId = String(subscription.customer);
    const userId = await extractUserId(supabase, customerId);

    if (!userId) {
      log({ msg: "No user match for subscription", eventType, subscriptionId: subscription.id, customerId });
      return { userId: null, tier } as const;
    }

    const payload = buildSubscriptionRecord({
      userId,
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status ?? null,
      tier,
      cadence,
      priceId,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
    });

    const { error: upsertError } = await supabase.from("subscriptions").upsert(payload);

    if (upsertError) {
      logError({
        msg: "Subscription upsert failed",
        eventType,
        subscriptionId: subscription.id,
        userId,
        error: upsertError.message,
      });
    } else {
      log({
        msg: "Subscription upsert successful",
        eventType,
        subscriptionId: subscription.id,
        userId,
        status: subscription.status,
        tier,
        cadence,
      });
    }

    return { userId, tier } as const;
  };

const awardBonusCoins = async (supabase: SupabaseClient, userId: string, tier: SubscriptionTier) => {
  const needsBonus = shouldAwardBonus(tier, false);
  if (!needsBonus) {
    return;
  }

  const { data: existingBonus, error: existingBonusError } = await supabase
      .from("coin_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", VIP_BONUS_TYPE)
      .eq("description", VIP_BONUS_DESCRIPTION)
      .maybeSingle();

  if (existingBonusError) {
    logError({ msg: "Failed to check existing bonus", userId, error: existingBonusError.message });
    return;
  }

  if (!shouldAwardBonus(tier, Boolean(existingBonus))) {
    log({ msg: "Bonus already awarded", userId });
    return;
  }

  const { error: coinsError } = await supabase.rpc("award_coins", {
    _user_id: userId,
    _amount: VIP_BONUS_AMOUNT,
    _type: VIP_BONUS_TYPE,
    _description: VIP_BONUS_DESCRIPTION,
  });

  if (coinsError) {
    logError({ msg: "Failed to award bonus coins", userId, error: coinsError.message });
  } else {
    log({ msg: "Bonus coins awarded", userId, amount: 250 });
  }
};

serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logError({ msg: "Missing stripe-signature header" });
    return jsonResponse({ error: "missing_signature" }, 400);
  }

  const rawBody = await req.arrayBuffer();
  if (rawBody.byteLength === 0) {
    logError({ msg: "Empty request body" });
    return jsonResponse({ error: "empty_body" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(new Uint8Array(rawBody), signature, stripeWebhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logError({ msg: "Signature verification failed", error: message });
    return jsonResponse({ error: "signature_verification_failed" }, 400);
  }

  // Idempotency guard
  const { error: idempotencyError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id });

  if (idempotencyError) {
    const duplicate = isDuplicateEventError(idempotencyError);
    log({ msg: "Duplicate event", eventId: event.id, eventType: event.type, duplicate });
    return jsonResponse({ received: true, duplicate: true });
  }

  log({ msg: "Event received", eventId: event.id, eventType: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log({ msg: "Checkout session completed", sessionId: session.id, customerId: session.customer });

        if (session.mode === "subscription" && session.subscription) {
          let subscription: StripeSubscription | null = null;
          try {
            subscription = await stripe.subscriptions.retrieve(session.subscription);
          } catch (error) {
            logError({ msg: "Failed to retrieve subscription", subscriptionId: session.subscription, error: (error as Error).message });
          }

          if (subscription) {
            const { userId, tier } = await upsertSubscription(supabase, event.type, subscription);
            if (userId) {
              await awardBonusCoins(supabase, userId, tier);
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripeSubscription;
        await upsertSubscription(supabase, event.type, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            await upsertSubscription(supabase, event.type, subscription);
          } catch (error) {
            logError({ msg: "Failed to refresh subscription from invoice", subscriptionId: invoice.subscription, error: (error as Error).message });
          }
        }
        break;
      }

      default:
        log({ msg: "Unhandled event type", eventType: event.type });
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logError({ msg: "Processing error", eventType: event.type, error: message });
    return jsonResponse({ error: "processing_error" }, 500);
  }
});