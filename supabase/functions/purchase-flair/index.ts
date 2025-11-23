import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const PurchaseFlairSchema = z.object({
  flairId: z.string().trim().min(1, "flairId").max(64, "flairId"),
  equip: z.boolean().optional(),
});

const FLARE_DURATION_DAYS = 5;
const TIER_LEVEL: Record<string, number> = { free: 0, vip: 1 };

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
    if (!authResult.user || !authResult.client) {
      logWarn("purchase-flair: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("purchase-flair: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
    }

    const parsed = PurchaseFlairSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("purchase-flair: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
    }

    const { flairId, equip = true } = parsed.data;
    const supabase = authResult.client;

    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("trial_premium_ends_at")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    const isOnTrial = Boolean(
      profileCheck?.trial_premium_ends_at &&
        new Date(profileCheck.trial_premium_ends_at) > new Date(),
    );
    const purchaseScope = isOnTrial ? "TRIAL" : "OWNED";

    const { data: flair, error: flairError } = await supabase
      .from("profile_flairs")
      .select("*")
      .eq("id", flairId)
      .eq("is_active", true)
      .single();

    if (flairError || !flair) {
      logWarn("purchase-flair: flair not found", {
        userId: authResult.user.id,
        flairId,
        error: flairError?.message,
      });
      return jsonResponse({ error: "Flair not found" }, 404, context.origin);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", authResult.user.id)
      .single();

    if (profileError) {
      logError("purchase-flair: profile tier lookup failed", {
        userId: authResult.user.id,
        error: profileError.message,
      });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500, context.origin);
    }

    const userTier = (profile?.subscription_tier ?? "free").toLowerCase();
    const requiredTier = (flair.required_plan ?? "free").toLowerCase();

    if ((TIER_LEVEL[userTier] ?? 0) < (TIER_LEVEL[requiredTier] ?? 0)) {
      return jsonResponse({
        error: `This flair requires ${requiredTier} subscription`,
        requiredPlan: requiredTier,
      }, 403, context.origin);
    }

    const flairCost = flair.cost;

    const { data: existingFlair, error: existingError } = await supabase
      .from("user_flairs")
      .select("id, expires_at")
      .eq("user_id", authResult.user.id)
      .eq("flair_id", flairId)
      .maybeSingle();

    if (existingError) {
      logError("purchase-flair: existing flair lookup failed", {
        userId: authResult.user.id,
        error: existingError.message,
      });
      return jsonResponse({ error: "FLAIR_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (existingFlair) {
      const now = Date.now();
      const expiry = existingFlair.expires_at ? Date.parse(existingFlair.expires_at) : null;
      if (!expiry || expiry > now) {
        return jsonResponse({ error: "You already own this flair" }, 400, context.origin);
      }
    }

    const { data: coinsData, error: coinsError } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", authResult.user.id)
      .single();

    if (coinsError || !coinsData) {
      logError("purchase-flair: coin lookup failed", {
        userId: authResult.user.id,
        error: coinsError?.message,
      });
      return jsonResponse({ error: "COIN_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (coinsData.balance < flairCost) {
      return jsonResponse({
        error: `Insufficient coins. You need ${flairCost} coins to purchase this flair.`,
      }, 400, context.origin);
    }

    const { error: deductError } = await supabase.rpc("deduct_coins", {
      _user_id: authResult.user.id,
      _amount: flairCost,
      _type: "flair_purchase",
      _description: `Purchased ${flair.name_key} flair`,
      _reference_id: flairId,
    });

    if (deductError) {
      logError("purchase-flair: deduct coins failed", {
        userId: authResult.user.id,
        error: deductError.message,
      });
      return jsonResponse({ error: "COIN_DEDUCTION_FAILED" }, 500, context.origin);
    }

    if (equip) {
      const { error: unequipError } = await supabase
        .from("user_flairs")
        .update({ is_equipped: false, is_featured: false })
        .eq("user_id", authResult.user.id)
        .eq("is_equipped", true);

      if (unequipError) {
        logError("purchase-flair: unequip failed", {
          userId: authResult.user.id,
          error: unequipError.message,
        });
        return jsonResponse({ error: "EQUIP_UPDATE_FAILED" }, 500, context.origin);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + FLARE_DURATION_DAYS);
    const acquiredAt = new Date().toISOString();

    const { data: purchasedFlair, error: purchaseError } = await supabase
      .from("user_flairs")
      .upsert({
        user_id: authResult.user.id,
        flair_id: flairId,
        is_equipped: equip,
        is_featured: equip,
        is_public: equip,
        acquired_at: acquiredAt,
        expires_at: expiresAt.toISOString(),
        purchase_scope: purchaseScope,
        last_equipped_at: equip ? acquiredAt : null,
      }, { onConflict: "user_id,flair_id", ignoreDuplicates: false })
      .select()
      .single();

    if (purchaseError || !purchasedFlair) {
      logError("purchase-flair: upsert failed", {
        userId: authResult.user.id,
        error: purchaseError?.message,
      });
      return jsonResponse({ error: "FLAIR_PURCHASE_FAILED" }, 500, context.origin);
    }

    logInfo("purchase-flair: success", {
      userId: authResult.user.id,
      flairId,
      equip,
      coinsDeducted: flairCost,
      ipAddress: context.ipAddress,
    });

    return jsonResponse({
      success: true,
      flair: { ...purchasedFlair, details: flair },
      coinsDeducted: flairCost,
    }, 200, context.origin);
  } catch (error) {
    logError("purchase-flair: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});