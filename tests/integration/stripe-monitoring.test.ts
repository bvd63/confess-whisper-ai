import { describe, it, expect } from "vitest";
import {
  buildStripeMonitorPayload,
  buildSubscriptionSyncTelemetry,
} from "../../supabase/functions/_shared/stripe-monitoring";

describe("stripe monitoring helpers", () => {
  it("builds structured payloads with defaults", () => {
    const payload = buildStripeMonitorPayload({
      component: "stripe-webhook",
      event: "webhook_received",
      metadata: { eventId: "evt_123" },
    }, new Date("2025-01-01T00:00:00.000Z"));

    expect(payload.source).toBe("stripe-monitoring");
    expect(payload.timestamp).toBe("2025-01-01T00:00:00.000Z");
    expect(payload.metadata.eventId).toBe("evt_123");
    expect(payload.severity).toBe("info");
  });

  it("elevates severity when subscription tiers mismatch", () => {
    const payload = buildSubscriptionSyncTelemetry({
      component: "fix-subscription-sync",
      userId: "user_123",
      stripeStatus: "active",
      resolvedTier: "vip",
      existingTier: "premium",
      priceId: "price_abc",
    });

    expect(payload.severity).toBe("warn");
    expect(payload.metadata.mismatch).toBe(true);
    expect(payload.metadata.userId).toBe("user_123");
  });
});
