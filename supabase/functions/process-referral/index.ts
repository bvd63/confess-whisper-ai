import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { createServiceClient, requireAuth } from "../_shared/supabase.ts";

const ReferralSchema = z.object({
  referralCode: z.string().trim().min(1, "referralCode").max(64, "referralCode"),
});

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
      logWarn("process-referral: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (parseError) {
      logWarn("process-referral: invalid JSON", {
        userId: authResult.user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
    }

    const parsed = ReferralSchema.safeParse(rawBody);
    if (!parsed.success) {
      logWarn("process-referral: invalid payload", {
        userId: authResult.user.id,
        issues: parsed.error.flatten().fieldErrors,
      });
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
    }

    const referralCode = parsed.data.referralCode.trim();
    const serviceClient = createServiceClient();

    const { data: referrerProfile, error: referrerError } = await serviceClient
      .from("profiles")
      .select("user_id, total_referrals")
      .eq("referral_code", referralCode)
      .single();

    if (referrerError || !referrerProfile) {
      logWarn("process-referral: referral code not found", {
        userId: authResult.user.id,
        referralCode,
        error: referrerError?.message,
      });
      return jsonResponse({ success: false, message: "Invalid referral code" }, 400, context.origin);
    }

    if (referrerProfile.user_id === authResult.user.id) {
      logWarn("process-referral: self referral blocked", { userId: authResult.user.id });
      return jsonResponse({ success: false, message: "Cannot use your own referral code" }, 400, context.origin);
    }

    const { data: existingProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("referred_by")
      .eq("user_id", authResult.user.id)
      .single();

    if (profileError) {
      logError("process-referral: profile lookup failed", {
        userId: authResult.user.id,
        error: profileError.message,
      });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500, context.origin);
    }

    if (existingProfile?.referred_by) {
      logWarn("process-referral: referral already used", { userId: authResult.user.id });
      return jsonResponse({ success: false, message: "You have already used a referral code" }, 400, context.origin);
    }

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ referred_by: referrerProfile.user_id })
      .eq("user_id", authResult.user.id);

    if (updateError) {
      logError("process-referral: failed to update profile", {
        userId: authResult.user.id,
        error: updateError.message,
      });
      return jsonResponse({ error: "PROFILE_UPDATE_FAILED" }, 500, context.origin);
    }

    const { error: referralError } = await serviceClient.from("referrals").insert({
      referrer_user_id: referrerProfile.user_id,
      referred_user_id: authResult.user.id,
      referral_code: referralCode,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    if (referralError) {
      logError("process-referral: referral insert failed", {
        userId: authResult.user.id,
        error: referralError.message,
      });
      return jsonResponse({ error: "REFERRAL_INSERT_FAILED" }, 500, context.origin);
    }

    const nextTotal = (referrerProfile.total_referrals ?? 0) + 1;
    const { error: countError } = await serviceClient
      .from("profiles")
      .update({ total_referrals: nextTotal })
      .eq("user_id", referrerProfile.user_id);

    if (countError) {
      logError("process-referral: referral count update failed", {
        referrerId: referrerProfile.user_id,
        error: countError.message,
      });
    }

    logInfo("process-referral: success", {
      userId: authResult.user.id,
      referrerId: referrerProfile.user_id,
      ipAddress: context.ipAddress,
    });

    return jsonResponse({
      success: true,
      message: "Referral processed successfully. Post your first confession to earn coins!",
    }, 200, context.origin);
  } catch (error) {
    logError("process-referral: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});