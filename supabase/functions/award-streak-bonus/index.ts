import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo } from "../_shared/logger.ts";
import { ensureEdgeAuthorized, getRequestContext } from "../_shared/security.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const BONUSES = [
  { days: 3, coins: 10 },
  { days: 5, coins: 20 },
  { days: 7, coins: 50 },
];

const AwardPayloadSchema = z.object({
  userId: z.string().uuid(),
  currentStreak: z.number().int().min(1).max(365),
});

serve(async (req) => {
  const { origin } = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(origin);
  }

  const edgeResponse = ensureEdgeAuthorized(req, origin);
  if (edgeResponse) {
    return edgeResponse;
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "INVALID_JSON" }, 400, origin);
    }

    const parsed = AwardPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, origin);
    }

    const payload = parsed.data;
    const bonus = BONUSES.find((item) => item.days === payload.currentStreak);
    if (!bonus) {
      return jsonResponse({ ok: false, reason: "no-bonus" }, 200, origin);
    }

    const supabase = createServiceClient();
    const { error } = await supabase.rpc("award_coins", {
      p_user_id: payload.userId,
      p_amount: bonus.coins,
      p_session_id: `streak_${payload.currentStreak}_${new Date().toISOString().split("T")[0]}`,
      p_description: `Streak bonus: ${payload.currentStreak} days`,
    });

    if (error) {
      logError("award-streak-bonus: award failed", { error: error.message, userId: payload.userId });
      return jsonResponse({ error: "COIN_AWARD_FAILED" }, 500, origin);
    }

    logInfo("award-streak-bonus: coins awarded", {
      userId: payload.userId,
      coins: bonus.coins,
      currentStreak: payload.currentStreak,
    });

    return jsonResponse({ ok: true, awarded: bonus.coins }, 200, origin);
  } catch (error) {
    logError("award-streak-bonus: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, origin);
  }
});
