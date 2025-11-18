import { describe, it, expect } from "vitest";
import {
  resolveTier,
  deriveCadence,
  buildSubscriptionRecord,
  isDuplicateEventError,
  shouldAwardBonus,
  VIP_BONUS_AMOUNT,
  VIP_BONUS_DESCRIPTION,
  VIP_BONUS_TYPE,
  parseStripeSignatureTimestamp,
  isSignatureTimestampFresh,
  isNegativeInvoice,
} from "../../supabase/functions/stripe-webhook/utils";

describe("stripe-webhook utils", () => {
  const priceEnv = {
    vipMonthly: "price_vip_month",
    vipYearly: "price_vip_year",
    premiumMonthly: "price_premium_month",
    premiumYearly: "price_premium_year",
  };

  describe("resolveTier", () => {
    it("returns vip for configured VIP price IDs", () => {
      expect(resolveTier("price_vip_month", priceEnv)).toBe("vip");
      expect(resolveTier("price_vip_year", priceEnv)).toBe("vip");
    });

    it("returns premium for configured premium prices", () => {
      expect(resolveTier("price_premium_year", priceEnv)).toBe("premium");
    });

    it("defaults to free when price is missing or not configured", () => {
      expect(resolveTier(undefined, priceEnv)).toBe("free");
      expect(resolveTier("unknown_price", priceEnv)).toBe("free");
    });
  });

  describe("buildSubscriptionRecord", () => {
    it("creates an upsert payload with ISO timestamps", () => {
      const result = buildSubscriptionRecord({
        userId: "user-1",
        subscriptionId: "sub-1",
        customerId: "cus-1",
        status: "active",
        tier: "vip",
        cadence: "monthly",
        priceId: "price_vip_month",
        currentPeriodStart: 1700000000,
        currentPeriodEnd: 1700600000,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      });

      expect(result).toMatchObject({
        user_id: "user-1",
        stripe_subscription_id: "sub-1",
        tier: "vip",
        cadence: "monthly",
        price_id: "price_vip_month",
        cancel_at_period_end: false,
        canceled_at: null,
      });
      expect(result.current_period_start).toEqual(new Date(1700000000 * 1000).toISOString());
      expect(result.current_period_end).toEqual(new Date(1700600000 * 1000).toISOString());
    });
  });

  describe("deriveCadence", () => {
    it("maps annual intervals to yearly cadence", () => {
      expect(deriveCadence("year")).toBe("yearly");
    });

    it("defaults to monthly for other values", () => {
      expect(deriveCadence("month")).toBe("monthly");
      expect(deriveCadence(undefined)).toBe("monthly");
    });
  });

  describe("shouldAwardBonus", () => {
    it("returns true only for VIP tier without existing bonus", () => {
      expect(shouldAwardBonus("vip", false)).toBe(true);
      expect(shouldAwardBonus("vip", true)).toBe(false);
      expect(shouldAwardBonus("premium", false)).toBe(false);
    });

    it("exposes constants for the bonus payload", () => {
      expect(VIP_BONUS_TYPE).toBe("subscription_bonus");
      expect(VIP_BONUS_DESCRIPTION).toBe("VIP Welcome Bonus");
      expect(VIP_BONUS_AMOUNT).toBeGreaterThan(0);
    });
  });

  describe("idempotency helper", () => {
    it("detects unique violation error codes", () => {
      expect(isDuplicateEventError({ code: "23505" })).toBe(true);
      expect(isDuplicateEventError({ code: "unique_violation" })).toBe(true);
      expect(isDuplicateEventError({ code: "PGRST" })).toBe(false);
      expect(isDuplicateEventError(undefined)).toBe(false);
    });
  });

  describe("signature timestamp helpers", () => {
    it("parses timestamps from Stripe signature header", () => {
      const header = "t=1700000000,v1=abc,v0=def";
      expect(parseStripeSignatureTimestamp(header)).toBe(1_700_000_000);
    });

    it("returns null for malformed headers", () => {
      expect(parseStripeSignatureTimestamp(null)).toBeNull();
      expect(parseStripeSignatureTimestamp("v1=abc")).toBeNull();
    });

    it("validates timestamp freshness within tolerance", () => {
      const now = 1_700_000_500;
      expect(isSignatureTimestampFresh(1_700_000_400, 300, now)).toBe(true);
      expect(isSignatureTimestampFresh(1_699_999_000, 100, now)).toBe(false);
      expect(isSignatureTimestampFresh(null, 300, now)).toBe(false);
    });
  });

  describe("negative invoice detection", () => {
    it("flags invoices with negative totals", () => {
      expect(isNegativeInvoice({ total: -100 })).toBe(true);
      expect(isNegativeInvoice({ amount_paid: -1 })).toBe(true);
      expect(isNegativeInvoice({ subtotal: -50 })).toBe(true);
    });

    it("flags negative line items", () => {
      expect(isNegativeInvoice({ lines: { data: [{ amount: -25 }] } })).toBe(true);
    });

    it("allows positive or zero invoices", () => {
      expect(isNegativeInvoice({ total: 0 })).toBe(false);
      expect(isNegativeInvoice({ amount_paid: 100 })).toBe(false);
      expect(isNegativeInvoice(undefined)).toBe(false);
    });
  });
});
