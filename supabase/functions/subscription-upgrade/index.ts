import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getServerEnv } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

type SubscriptionTier = "free" | "vip";

const UpgradeRequestSchema = z.object({
  targetPriceId: z.string().trim().min(4, "targetPriceId").max(128, "targetPriceId"),
});

const resolveTierForPrice = (priceId: string): SubscriptionTier => {
  const mapping: Record<string, SubscriptionTier> = {
    [Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") ?? ""]: "vip",
    [Deno.env.get("STRIPE_PRICE_VIP_YEARLY") ?? ""]: "vip",
  };
  return mapping[priceId] ?? "vip";
};

serve(async (req) => {
  const context = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(context.origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, context.origin, {
      "Allow": "POST,OPTIONS",
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user) {
      logWarn("subscription-upgrade: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("subscription-upgrade: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
    }

    const parsed = UpgradeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("subscription-upgrade: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
    }

    const { targetPriceId } = parsed.data;
    const env = getServerEnv();
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });
    const supabaseAdmin = createServiceClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (profileError) {
      logError("subscription-upgrade: profile lookup failed", {
        userId: authResult.user.id,
        error: profileError.message,
      });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (!profile?.stripe_subscription_id) {
      return jsonResponse({ error: "No active subscription found" }, 400, context.origin);
    }

    logInfo("subscription-upgrade: request", {
      userId: authResult.user.id,
      targetPriceId,
      ipAddress: context.ipAddress,
    });

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const currentItemId = subscription.items.data[0]?.id;
    if (!currentItemId) {
      logError("subscription-upgrade: subscription missing items", {
        userId: authResult.user.id,
        subscriptionId: profile.stripe_subscription_id,
      });
      return jsonResponse({ error: "SUBSCRIPTION_INVALID" }, 500, context.origin);
    }

    const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: currentItemId, price: targetPriceId }],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "now",
    });

    const refreshedSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const periodEnd = refreshedSubscription.current_period_end || updatedSubscription.current_period_end || null;

    const newTier = resolveTierForPrice(targetPriceId);
    const subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: true,
        subscription_tier: newTier,
        subscription_status: "active",
        subscription_ends_at: subscriptionEndsAt,
      })
      .eq("user_id", authResult.user.id);

    if (updateError) {
      logError("subscription-upgrade: profile update failed", {
        userId: authResult.user.id,
        error: updateError.message,
      });
      return jsonResponse({ error: "PROFILE_UPDATE_FAILED" }, 500, context.origin);
    }

    logInfo("subscription-upgrade: success", {
      userId: authResult.user.id,
      tier: newTier,
      subscriptionEndsAt,
    });

    return jsonResponse({
      success: true,
      message: "upgrade_processing",
      tier: newTier,
    }, 200, context.origin);
  } catch (error) {
    logError("subscription-upgrade: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});
