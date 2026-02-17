import { describe, expect, it } from "vitest";
import { resolveServerAiAccess } from "../../supabase/functions/ai-confession-response/utils";
import { RATE_LIMIT_CONFIGS } from "../../supabase/functions/rate-limit/utils";

describe("ai-confession-response server tier + rate-limit", () => {
  it("ignores client isVip=true when server profile is free", () => {
    const result = resolveServerAiAccess(
      {
        subscription_tier: "free",
        is_premium: false,
        trial_active: false,
        trial_premium_ends_at: null,
      },
      true,
    );

    expect(result).toEqual({
      isVipServer: false,
      model: "google/gemini-2.5-flash-lite",
      rateLimitAction: "ai_response_free",
    });
  });

  it("maps free traffic to stricter server-side rate limit", () => {
    const result = resolveServerAiAccess({ subscription_tier: "free", is_premium: false }, false);
    const config = RATE_LIMIT_CONFIGS[result.rateLimitAction];

    expect(result.rateLimitAction).toBe("ai_response_free");
    expect(config).toEqual(RATE_LIMIT_CONFIGS.ai_response_free);
  });

  it("gives VIP users higher allowance than free users for same burst", () => {
    const freeLimit = RATE_LIMIT_CONFIGS.ai_response_free.maxAttempts;
    const vipLimit = RATE_LIMIT_CONFIGS.ai_response_vip.maxAttempts;
    const sameBurst = freeLimit + 1;

    const freeWouldRateLimit = sameBurst > freeLimit;
    const vipWouldRateLimit = sameBurst > vipLimit;

    expect(freeWouldRateLimit).toBe(true);
    expect(vipWouldRateLimit).toBe(false);
    expect(vipLimit).toBeGreaterThan(freeLimit);
  });
});
