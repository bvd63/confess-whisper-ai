import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

const STRIPE_PRICE_IDS = {
  premium_monthly: "price_1SJ0vvR7kygIyYg9oT1ju6lQ",
  premium_yearly: "price_1SJ0vvR7kygIyYg9yORadPGD",
  vip_monthly: "price_1SJ0vwR7kygIyYg9OeCiqV00",
  vip_yearly: "price_1SJ0vvR7kygIyYg9BJuciYGd",
} as const;

type ManageAction = "status" | "change" | "cancel" | "reactivate";

const ManageSubscriptionSchema = z.object({
  action: z.enum(["change", "cancel", "reactivate", "status"]),
  priceId: z.string().trim().min(4).max(128).optional(),
  prorationBehavior: z.string().trim().min(3).max(64).optional(),
  effective: z.enum(["now", "period_end"]).optional(),
});

const respondError = (message: string, origin: string | null, status = 400) =>
  jsonResponse({ error: message }, status, origin);

const determineTier = (priceId: string) => {
  if (priceId === STRIPE_PRICE_IDS.vip_monthly || priceId === STRIPE_PRICE_IDS.vip_yearly) {
    return "vip";
  }
  if (priceId === STRIPE_PRICE_IDS.premium_monthly || priceId === STRIPE_PRICE_IDS.premium_yearly) {
    return "premium";
  }
  return "premium";
};

const ensureCustomer = async (stripe: Stripe, email: string) => {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    return customers.data[0].id;
  }
  const customer = await stripe.customers.create({ email });
  return customer.id;
};

const fetchLatestSubscription = async (stripe: Stripe, customerId: string) => {
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
  return subscriptions.data.length > 0 ? subscriptions.data[0] : null;
};

serve(async (req) => {
  const context = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(context.origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, context.origin, { "Allow": "POST,OPTIONS" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.user.email) {
      logWarn("subscription-manage: unauthorized", { reason: authResult.error });
      return respondError("UNAUTHORIZED", context.origin, 401);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("subscription-manage: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return respondError("INVALID_JSON", context.origin, 400);
    }

    const parsed = ManageSubscriptionSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("subscription-manage: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return respondError("INVALID_PAYLOAD", context.origin, 400);
    }

    const payload = parsed.data;
    const env = getServerEnv();
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const supabaseAdmin = createServiceClient();

    const customerId = await ensureCustomer(stripe, authResult.user.email);
    const subscription = await fetchLatestSubscription(stripe, customerId);

    const baseLogContext = {
      userId: authResult.user.id,
      action: payload.action,
      ipAddress: context.ipAddress,
    };

    switch (payload.action as ManageAction) {
      case "status": {
        if (!subscription || !["active", "trialing"].includes(subscription.status)) {
          return jsonResponse({
            currentPlan: "free",
            status: "none",
            interval: null,
            cancelAtPeriodEnd: false,
            canReactivate: subscription?.status === "canceled" && Boolean(subscription.cancel_at_period_end),
          }, 200, context.origin);
        }

        const price = subscription.items.data[0]?.price;
        if (!price) {
          logError("subscription-manage: subscription missing price", baseLogContext);
          return respondError("SUBSCRIPTION_INVALID", context.origin, 500);
        }

        const currentPlan = determineTier(price.id);
        const interval = price.recurring?.interval === "year" ? "yearly" : "monthly";

        return jsonResponse({
          currentPlan,
          interval,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          canReactivate: subscription.cancel_at_period_end,
          priceId: price.id,
        }, 200, context.origin);
      }

      case "change": {
        if (!payload.priceId) {
          return respondError("priceId required for change action", context.origin, 400);
        }

        if (!subscription || !["active", "trialing"].includes(subscription.status)) {
          return respondError("No active subscription to change", context.origin, 400);
        }

        const subscriptionItem = subscription.items.data[0];
        if (!subscriptionItem) {
          logError("subscription-manage: missing subscription item", baseLogContext);
          return respondError("SUBSCRIPTION_INVALID", context.origin, 500);
        }

        if (subscriptionItem.price.id === payload.priceId) {
          return respondError("Already subscribed to this plan", context.origin, 400);
        }

        const updateParams: Stripe.SubscriptionUpdateParams = {
          items: [{ id: subscriptionItem.id, price: payload.priceId }],
          proration_behavior: payload.prorationBehavior ?? "create_prorations",
        };

        if (payload.effective === "period_end") {
          updateParams.proration_behavior = "none";
          updateParams.billing_cycle_anchor = "unchanged";
        }

        const updatedSubscription = await stripe.subscriptions.update(subscription.id, updateParams);
        const newPrice = updatedSubscription.items.data[0]?.price;
        const newTier = determineTier(payload.priceId);
        const newInterval = newPrice?.recurring?.interval === "year" ? "yearly" : "monthly";

        await supabaseAdmin
          .from("profiles")
          .update({ current_plan: newTier, last_sync_at: new Date().toISOString() })
          .eq("user_id", authResult.user.id);

        logInfo("subscription-manage: plan changed", { ...baseLogContext, newTier, priceId: payload.priceId });

        return jsonResponse({
          success: true,
          subscription: {
            id: updatedSubscription.id,
            currentPlan: newTier,
            interval: newInterval,
            status: updatedSubscription.status,
            currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          },
        }, 200, context.origin);
      }

      case "cancel": {
        if (!subscription || !["active", "trialing"].includes(subscription.status)) {
          return respondError("No active subscription to cancel", context.origin, 400);
        }

        const when = payload.effective ?? "period_end";
        logInfo("subscription-manage: cancel request", { ...baseLogContext, when });

        if (when === "now") {
          const canceled = await stripe.subscriptions.cancel(subscription.id);
          await supabaseAdmin
            .from("profiles")
            .update({ current_plan: "free", last_sync_at: new Date().toISOString() })
            .eq("user_id", authResult.user.id);

          return jsonResponse({
            success: true,
            canceledImmediately: true,
            subscription: { id: canceled.id, status: canceled.status },
          }, 200, context.origin);
        }

        const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
        return jsonResponse({
          success: true,
          canceledImmediately: false,
          endsAt: new Date(updated.current_period_end * 1000).toISOString(),
          subscription: {
            id: updated.id,
            status: updated.status,
            cancelAtPeriodEnd: true,
          },
        }, 200, context.origin);
      }

      case "reactivate": {
        if (!subscription) {
          return respondError("No subscription found to reactivate", context.origin, 400);
        }

        if (subscription.status === "active" && !subscription.cancel_at_period_end) {
          return respondError("Subscription is already active", context.origin, 400);
        }

        if (!subscription.cancel_at_period_end) {
          return respondError("Cannot reactivate this subscription. Please create a new subscription.", context.origin, 400);
        }

        const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
        const priceId = updated.items.data[0]?.price.id ?? "";
        const tier = determineTier(priceId);

        await supabaseAdmin
          .from("profiles")
          .update({ current_plan: tier, last_sync_at: new Date().toISOString() })
          .eq("user_id", authResult.user.id);

        return jsonResponse({
          success: true,
          subscription: {
            id: updated.id,
            currentPlan: tier,
            status: updated.status,
            currentPeriodEnd: new Date(updated.current_period_end * 1000).toISOString(),
          },
        }, 200, context.origin);
      }
    }

    return respondError("Invalid action", context.origin, 400);
  } catch (error) {
    logError("subscription-manage: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return respondError("INTERNAL_ERROR", context.origin, 500);
  }
});
