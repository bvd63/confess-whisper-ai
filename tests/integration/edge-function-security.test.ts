import { describe, expect, it } from "vitest";
import {
  extractBearerToken,
  isInternalSecretValid,
} from "../../supabase/functions/_shared/security";
import { parseCoinPurchaseFromSession } from "../../supabase/functions/_shared/coin-payments";

describe("edge function security helpers", () => {
  it("rejects missing or malformed bearer headers", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("extracts a valid bearer token", () => {
    expect(extractBearerToken("Bearer token-123")).toBe("token-123");
    expect(extractBearerToken(" bearer token-xyz ")).toBe("token-xyz");
  });

  it("validates internal secret strictly", () => {
    expect(isInternalSecretValid("secret", "secret")).toBe(true);
    expect(isInternalSecretValid("secret", "different")).toBe(false);
    expect(isInternalSecretValid("", "secret")).toBe(false);
    expect(isInternalSecretValid("secret", "")).toBe(false);
  });

  it("blocks coin verification when JWT owner mismatches Stripe metadata", () => {
    const result = parseCoinPurchaseFromSession(
      {
        id: "cs_test_123",
        payment_status: "paid",
        metadata: {
          user_id: "user-b",
          coins: "300",
        },
      },
      "user-a",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("FORBIDDEN_USER_MISMATCH");
    }
  });

  it("accepts paid coin session for the authenticated owner", () => {
    const result = parseCoinPurchaseFromSession(
      {
        id: "cs_test_456",
        payment_status: "paid",
        metadata: {
          user_id: "user-a",
          package_id: "pkg-1",
          coins: "150",
        },
      },
      "user-a",
    );

    expect(result).toEqual({
      ok: true,
      data: {
        userId: "user-a",
        coins: 150,
        packageId: "pkg-1",
      },
    });
  });
});
