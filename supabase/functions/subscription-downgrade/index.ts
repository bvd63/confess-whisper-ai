import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

type SubscriptionTier = "free" | "vip";

const DowngradeRequestSchema = z.object({
  targetPriceId: z.string().trim().min(4, "targetPriceId").max(128, "targetPriceId"),
});

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  vip: 1,
};

const resolveTierForPrice = (priceId: string): SubscriptionTier => {
  const vipIds = new Set([
    Deno.env.get("STRIPE_PRICE_VIP_MONTHLY") || "",
    Deno.env.get("STRIPE_PRICE_VIP_YEARLY") || "",
  ]);

  if (!priceId) {
    return "free";
  }

  return vipIds.has(priceId) ? "vip" : "free";
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
      logWarn("subscription-downgrade: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("subscription-downgrade: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
    }

    const parsed = DowngradeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("subscription-downgrade: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
    }

    const { targetPriceId } = parsed.data;
    const supabaseAdmin = createServiceClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (profileError) {
      logError("subscription-downgrade: profile lookup failed", {
        userId: authResult.user.id,
        error: profileError.message,
      });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500, context.origin);
    }

    const currentTier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
    const targetTier = resolveTierForPrice(targetPriceId);
    const targetTierLevel = tierHierarchy[targetTier];
    const currentTierLevel = tierHierarchy[currentTier] ?? tierHierarchy.free;

    logInfo("subscription-downgrade: comparing tiers", {
      userId: authResult.user.id,
      currentTier,
      targetTier,
      ipAddress: context.ipAddress,
    });

    if (targetTierLevel >= currentTierLevel) {
      logWarn("subscription-downgrade: invalid target", { currentTier, targetTier });
      return jsonResponse({
        error: "invalid_target",
        message: `Cannot downgrade from ${currentTier} to ${targetTier}`,
      }, 400, context.origin);
    }

    if (currentTier === targetTier) {
      return jsonResponse({ error: "already_on_plan", message: "Already on this plan" }, 400, context.origin);
    }

    const { error: insertError } = await supabaseAdmin.from("subscription_change_requests").insert({
      user_id: authResult.user.id,
      target_price_id: targetPriceId,
      target_tier: targetTier,
      action: "downgrade",
      status: "pending",
    });

    if (insertError) {
      logError("subscription-downgrade: request insert failed", {
        userId: authResult.user.id,
        error: insertError.message,
      });
      return jsonResponse({ error: "REQUEST_CREATION_FAILED" }, 500, context.origin);
    }

    const { error: auditError } = await supabaseAdmin.from("subscription_audit").insert({
      user_id: authResult.user.id,
      action: "downgrade_scheduled",
      data: {
        target_tier: targetTier,
        current_tier: currentTier,
        price_id: targetPriceId,
      },
    });

    if (auditError) {
      logWarn("subscription-downgrade: audit insert failed", {
        userId: authResult.user.id,
        error: auditError.message,
      });
    }

    logInfo("subscription-downgrade: scheduled", {
      userId: authResult.user.id,
      targetTier,
      currentTier,
    });

    return jsonResponse({
      success: true,
      message: "downgrade_scheduled",
      target_tier: targetTier,
      current_tier: currentTier,
    }, 200, context.origin);
  } catch (error) {
    logError("subscription-downgrade: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});
