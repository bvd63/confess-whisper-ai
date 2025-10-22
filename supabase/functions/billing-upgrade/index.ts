import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// CORS headers for browser invocations
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role to read/write safely
      { global: { headers: { Authorization: auth } } }
    );

    // current user
    const { data: { user }, error: meErr } = await supabase.auth.getUser();
    if (meErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { newPriceId } = await req.json();
    if (!newPriceId) {
      return new Response(JSON.stringify({ error: "Missing newPriceId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Try read current subscription row
    let { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2) Fallback: recover subscription directly from Stripe if DB row missing
    let stripeSubId = sub?.stripe_subscription_id as string | undefined;
    if (subErr || !stripeSubId) {
      // Try profile's customer id
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let customerId: string | undefined = profile?.stripe_customer_id || undefined;
      if (!customerId && user.email) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }

      if (customerId) {
        // Find most recent subscription (prefer active/trialing)
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
        const preferred = subs.data.find((s: Stripe.Subscription) => s.status === "active" || s.status === "trialing") || subs.data[0];
        if (preferred) {
          stripeSubId = preferred.id;
          // Upsert DB for consistency
          const price = preferred.items.data[0]?.price;
          const cadence = price?.recurring?.interval === "year" ? "yearly" : "monthly";
          const tier =
            (price?.id === Deno.env.get("PRICE_VIP_MONTHLY") || price?.id === Deno.env.get("PRICE_VIP_YEARLY")) ? "vip" :
            (price?.id === Deno.env.get("PRICE_PREMIUM_MONTHLY") || price?.id === Deno.env.get("PRICE_PREMIUM_YEARLY")) ? "premium" : "free";

          await supabase.from("subscriptions").upsert({
            user_id: user.id,
            stripe_customer_id: String(preferred.customer),
            stripe_subscription_id: preferred.id,
            status: preferred.status,
            tier,
            cadence,
            price_id: price?.id ?? "",
            current_period_start: new Date(preferred.current_period_start * 1000).toISOString(),
            current_period_end: new Date(preferred.current_period_end * 1000).toISOString(),
            cancel_at_period_end: !!preferred.cancel_at_period_end,
          });

          // Refresh local sub reference
          sub = {
            ...(sub || {}),
            user_id: user.id,
            stripe_customer_id: String(preferred.customer),
            stripe_subscription_id: preferred.id,
          } as any;
        }
      }
    }

    if (!stripeSubId) {
      return new Response(JSON.stringify({ error: "No active subscription" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Retrieve subscription from Stripe and perform upgrade with proration
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);

    const updated = await stripe.subscriptions.update(stripeSub.id, {
      items: [{ id: stripeSub.items.data[0].id, price: newPriceId }],
      proration_behavior: "create_prorations",
      payment_behavior: "default_incomplete",
      billing_cycle_anchor: "unchanged",
      expand: ["latest_invoice.payment_intent"],
    });

    // optimistic DB update if payment already succeeded
    const pi: any = (updated.latest_invoice as any)?.payment_intent;
    const paid = pi?.status === "succeeded";

    if (paid) {
      const tier = inferTier(newPriceId);
      const cadence = inferCadence(updated.items.data[0].price?.recurring?.interval);
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: String(updated.customer),
        stripe_subscription_id: updated.id,
        status: updated.status,
        tier,
        cadence,
        price_id: newPriceId,
        current_period_start: new Date(updated.current_period_start * 1000).toISOString(),
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        cancel_at_period_end: !!updated.cancel_at_period_end,
        pending_change: null,
      });
      return new Response(JSON.stringify({ ok: true, applied: "immediate" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // else webhook will finalize the DB update
    return new Response(JSON.stringify({ ok: true, applied: "webhook" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Upgrade failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function inferTier(priceId?: string) {
  if (!priceId) return "free";
  if (priceId === Deno.env.get("PRICE_VIP_MONTHLY") || priceId === Deno.env.get("PRICE_VIP_YEARLY")) return "vip";
  if (priceId === Deno.env.get("PRICE_PREMIUM_MONTHLY") || priceId === Deno.env.get("PRICE_PREMIUM_YEARLY")) return "premium";
  return "free";
}
function inferCadence(interval?: string) {
  if (interval === "year") return "yearly";
  if (interval === "month") return "monthly";
  return "monthly";
}
