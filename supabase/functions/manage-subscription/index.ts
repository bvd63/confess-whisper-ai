import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo } from "../_shared/logger.ts";

const PayloadSchema = z.object({
  action: z.enum(["cancel", "upgrade", "downgrade"]),
  newTier: z.literal("vip").optional(),
});

const stripeApiVersion = "2024-06-20";

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.user.email) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    const body = await req.json();
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: stripeApiVersion });
    const serviceClient = createServiceClient();

    const customers = await stripe.customers.list({ email: authResult.user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return jsonResponse({ error: "CUSTOMER_NOT_FOUND" }, 404, origin);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    if (!subscription) {
      return jsonResponse({ error: "SUBSCRIPTION_NOT_FOUND" }, 404, origin);
    }

    logInfo("manage-subscription", { userId: authResult.user.id, action: payload.action });

    if (payload.action === "cancel") {
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
      await serviceClient
        .from("profiles")
        .update({ subscription_cancel_at_period_end: true })
        .eq("user_id", authResult.user.id);

      return jsonResponse({ success: true, message: "Subscription will cancel at period end" }, 200, origin);
    }

    const currentInterval = subscription.items.data[0]?.price?.recurring?.interval ?? "month";
    const newPrice = currentInterval === "year"
      ? env.STRIPE_PRICE_VIP_YEARLY
      : env.STRIPE_PRICE_VIP_MONTHLY;

    if (!newPrice) {
      return jsonResponse({ error: "PRICE_NOT_CONFIGURED" }, 500, origin);
    }

    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPrice,
      }],
      proration_behavior: "create_prorations",
    });

    await serviceClient
      .from("profiles")
      .update({ subscription_tier: payload.newTier ?? "vip" })
      .eq("user_id", authResult.user.id);

    return jsonResponse({ success: true, message: `Subscription ${payload.action}d to vip` }, 200, origin);
  } catch (error) {
    logError("manage-subscription failed", { error: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});
