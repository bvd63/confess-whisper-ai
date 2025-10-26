import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature")!;
    const raw = await req.arrayBuffer();
    // Deno requires async verification to avoid SubtleCrypto sync error
    event = await stripe.webhooks.constructEventAsync(new Uint8Array(raw), sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Idempotency via simple events table
  const { data: existed } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (!existed) {
    await supabase.from("stripe_events").insert({ id: event.id });
  } else {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  const saveSub = async (sub: any) => {
    // Resolve tier/cadence from price
    const price = sub.items?.data?.[0]?.price;
    const priceId = price?.id as string | undefined;
    const cadence = price?.recurring?.interval === "year" ? "yearly" : "monthly";
    const tier =
      priceId === Deno.env.get("PRICE_VIP_MONTHLY") || priceId === Deno.env.get("PRICE_VIP_YEARLY")
        ? "vip"
        : priceId === Deno.env.get("PRICE_PREMIUM_MONTHLY") || priceId === Deno.env.get("PRICE_PREMIUM_YEARLY")
        ? "premium"
        : "free";

    // Find user: prefer existing subscriptions row, else fallback to profiles if it carries customer id
    let userId: string | undefined;
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", String(sub.customer))
      .maybeSingle();
    userId = subRow?.user_id as string | undefined;

    if (!userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, stripe_customer_id")
        .eq("stripe_customer_id", String(sub.customer))
        .maybeSingle();
      userId = (profile as any)?.user_id;
    }

    if (!userId) {
      console.log(JSON.stringify({ level: "info", msg: "No user match for subscription", customer: String(sub.customer), subscriptionId: sub.id }));
      return; // nothing to persist yet
    }
    const payload = {
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      status: sub.status,
      tier,
      cadence,
      price_id: priceId ?? "",
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: !!sub.cancel_at_period_end,
    };
    const { error: upsertError } = await supabase.from("subscriptions").upsert(payload);
    console.log(JSON.stringify({ level: upsertError ? "error" : "info", msg: upsertError ? "Subscription upsert failed" : "Subscription upsert ok", eventType: event.type, userId, subscriptionId: sub.id, status: sub.status, tier, cadence, priceId, cancelAtPeriodEnd: !!sub.cancel_at_period_end }));
  };

  try {
    console.log(JSON.stringify({ level: "info", msg: "Stripe webhook received", eventType: event.type, eventId: event.id }));
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await saveSub(sub);
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as any;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription);
          await saveSub(sub);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await saveSub(sub);
        break;
      }
      default: {
        console.log(JSON.stringify({ level: "info", msg: "Unhandled event type", eventType: event.type }));
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    console.log(JSON.stringify({ level: "error", msg: "Stripe webhook processing error", error: e?.message || String(e), eventType: event?.type }));
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});