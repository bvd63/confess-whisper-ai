import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isVipPriceId } from "../_shared/stripe-config.ts";
import {
  createBillingPortalUrl,
  getManageLifecycleBlock,
  resolveSubscriptionLifecycleState,
} from "../_shared/subscription-lifecycle.ts";

// CORS headers for browser invocations
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

const getAppBaseUrl = (): string => {
  const configuredUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").trim();
  if (!configuredUrl) {
    throw new Error("APP_URL is not configured");
  }
  return new URL(configuredUrl).origin;
};

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
    if (!isVipPriceId(newPriceId)) {
      return new Response(JSON.stringify({ error: "Invalid newPriceId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      supabase,
      profileUserId: user.id,
      profileEmail: user.email ?? null,
      customerIdHint: profile?.stripe_customer_id ?? null,
    });
    const lifecycleBlock = getManageLifecycleBlock(lifecycle);
    if (lifecycleBlock) {
      const portalUrl = await createBillingPortalUrl({
        stripe,
        customerId: lifecycle.customerId,
        returnUrl: `${getAppBaseUrl()}/profile`,
      }).catch(() => null);

      return new Response(
        JSON.stringify({
          error: lifecycleBlock.message,
          code: lifecycleBlock.code,
          subscriptionStatus: lifecycle.subscriptionStatus,
          useCustomerPortal: lifecycleBlock.requiresPortal,
          portalUrl,
        }),
        {
          status: lifecycleBlock.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!lifecycle.subscriptionId || lifecycle.category !== "active_or_trialing") {
      return new Response(
        JSON.stringify({ error: "No active subscription", code: "NO_ACTIVE_SUBSCRIPTION" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Retrieve subscription from Stripe and perform upgrade with proration
    const stripeSub = await stripe.subscriptions.retrieve(lifecycle.subscriptionId);

    const updated = await stripe.subscriptions.update(stripeSub.id, {
      items: [{ id: stripeSub.items.data[0].id, price: newPriceId }],
      proration_behavior: "create_prorations",
      payment_behavior: "default_incomplete",
      billing_cycle_anchor: "unchanged",
      expand: ["latest_invoice.payment_intent"],
    });

    const pi: any = (updated.latest_invoice as any)?.payment_intent;
    // Webhook reconciliation is the only source of truth for entitlement/profile updates.
    return new Response(
      JSON.stringify({ ok: true, applied: "webhook", paymentIntentStatus: pi?.status ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Upgrade failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
