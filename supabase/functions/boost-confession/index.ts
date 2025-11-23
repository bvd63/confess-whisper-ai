import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const BoostPayloadSchema = z.object({
  confessionId: z.string().min(8, "confessionId"),
});

const BOOST_COST = 15;
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  const { origin, ipAddress, userAgent } = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.client) {
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = BoostPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const supabase = authResult.client;

    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("trial_premium_ends_at")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    const isOnTrial = Boolean(profileCheck?.trial_premium_ends_at && new Date(profileCheck.trial_premium_ends_at) > new Date());
    const purchaseScope = isOnTrial ? "TRIAL" : "OWNED";

    const { data: confession, error: confessionError } = await supabase
      .from("confessions")
      .select("id, user_id")
      .eq("id", payload.confessionId)
      .maybeSingle();

    if (confessionError || !confession) {
      return jsonResponse({ error: "CONFESSION_NOT_FOUND" }, 404, origin);
    }

    if (confession.user_id !== authResult.user.id) {
      return jsonResponse({ error: "FORBIDDEN" }, 403, origin);
    }

    const { data: existingBoost } = await supabase
      .from("confession_boosts")
      .select("id, ends_at, status")
      .eq("confession_id", payload.confessionId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingBoost) {
      const secondsRemaining = Math.max(0, Math.floor((new Date(existingBoost.ends_at).getTime() - Date.now()) / 1000));
      return jsonResponse({
        error: "ALREADY_BOOSTED",
        secondsRemaining,
        endsAt: existingBoost.ends_at,
      }, 409, origin);
    }

    const { data: coinsData, error: coinsError } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (coinsError || !coinsData || coinsData.balance < BOOST_COST) {
      return jsonResponse({ error: "INSUFFICIENT_COINS" }, 400, origin);
    }

    const { error: deductError } = await supabase.rpc("deduct_coins", {
      _user_id: authResult.user.id,
      _amount: BOOST_COST,
      _type: "boost_confession",
      _description: "Boosted confession",
      _reference_id: payload.confessionId,
    });

    if (deductError) {
      logError("boost-confession: deduct failed", { error: deductError.message, userId: authResult.user.id });
      return jsonResponse({ error: "COIN_DEDUCTION_FAILED" }, 500, origin);
    }

    const boostUntil = new Date(Date.now() + BOOST_DURATION_MS).toISOString();
    const { data: boostData, error: boostError } = await supabase
      .from("confession_boosts")
      .insert({
        confession_id: payload.confessionId,
        user_id: authResult.user.id,
        coins_spent: BOOST_COST,
        status: "ACTIVE",
        ends_at: boostUntil,
        purchase_scope: purchaseScope,
      })
      .select()
      .maybeSingle();

    if (boostError || !boostData) {
      logError("boost-confession: create failed", { error: boostError?.message, userId: authResult.user.id });
      return jsonResponse({ error: "BOOST_CREATE_FAILED" }, 500, origin);
    }

    logInfo("boost-confession: boost created", {
      boostId: boostData.id,
      confessionId: payload.confessionId,
      userId: authResult.user.id,
      ipAddress,
      userAgent,
    });

    return jsonResponse({
      success: true,
      boost: {
        id: boostData.id,
        endsAt: boostData.ends_at,
        secondsRemaining: BOOST_DURATION_MS / 1000,
      },
      coinsDeducted: BOOST_COST,
    }, 200, origin);
  } catch (error) {
    logError("boost-confession: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});