import { describe, it, expect } from "vitest";
import {
  buildPriceAllowlist,
  buildPriceTierMap,
  evaluatePriceGuardDecision,
  isAllowedPriceId,
  resolveTierFromPriceMap,
} from "../../supabase/functions/_shared/stripe-price-allowlist";

describe("stripe price allowlist", () => {
  const makeGetter = (values: Record<string, string | undefined | null>) => (key: string) => values[key];

  it("collects price ids from both primary and legacy env keys", () => {
    const allowlist = buildPriceAllowlist(
      makeGetter({
        PRICE_VIP_MONTHLY: "price_vip_month",
        STRIPE_PRICE_VIP_YEARLY: "price_vip_year",
      }),
    );

    expect(allowlist.has("price_vip_month")).toBe(true);
    expect(allowlist.has("price_vip_year")).toBe(true);
  });

  it("trims values and ignores empty entries", () => {
    const allowlist = buildPriceAllowlist(
      makeGetter({
        PRICE_VIP_MONTHLY: "  price_trimmed  ",
        PRICE_VIP_YEARLY: "",
      }),
    );

    expect(allowlist.size).toBe(1);
    expect(allowlist.has("price_trimmed")).toBe(true);
  });

  it("validates requested price IDs", () => {
    const allowlist = buildPriceAllowlist(
      makeGetter({
        PRICE_VIP_MONTHLY: "price_vip_month",
      }),
    );

    expect(isAllowedPriceId("price_vip_month", allowlist)).toBe(true);
    expect(isAllowedPriceId("price_other", allowlist)).toBe(false);
    expect(isAllowedPriceId("", allowlist)).toBe(false);
  });

  it("maps price ids to tiers using both env naming schemes", () => {
    const map = buildPriceTierMap(
      makeGetter({
        PRICE_VIP_MONTHLY: "price_vip_month",
        STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_year",
      }),
    );

    expect(resolveTierFromPriceMap("price_vip_month", map)).toBe("vip");
    expect(resolveTierFromPriceMap("price_premium_year", map)).toBe("premium");
    expect(resolveTierFromPriceMap("unknown", map)).toBeNull();
  });

  describe("price guard decisions", () => {
    const allowlist = new Set(["price_vip_month"]);
    const context = { component: "create-checkout" as const, action: "checkout_session" };

    it("flags missing price IDs", () => {
      const decision = evaluatePriceGuardDecision(null, allowlist, context);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("missing_price_id");
      expect(decision.monitorPayload.metadata.allowed).toBe(false);
      expect(decision.monitorPayload.metadata.reason).toBe("missing_price_id");
    });

    it("flags disallowed price IDs", () => {
      const decision = evaluatePriceGuardDecision("price_other", allowlist, context);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("not_allowlisted");
      expect(decision.monitorPayload.metadata.priceId).toBe("price_other");
    });

    it("approves allowlisted price IDs", () => {
      const decision = evaluatePriceGuardDecision("price_vip_month", allowlist, context);
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe("allowed");
      expect(decision.monitorPayload.metadata.allowed).toBe(true);
    });
  });
});
