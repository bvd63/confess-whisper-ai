import { describe, expect, it, vi } from "vitest";
import { validateStripeWebhookEvent } from "../../supabase/functions/_shared/webhook-security";

describe("stripe webhook security", () => {
  it("returns 400 when signature is missing", async () => {
    const result = await validateStripeWebhookEvent({
      signature: null,
      webhookSecret: "whsec_test",
      rawBody: "{}",
      constructEvent: vi.fn(),
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "MISSING_SIGNATURE_OR_SECRET",
    });
  });

  it("returns 400 when signature validation fails", async () => {
    const result = await validateStripeWebhookEvent({
      signature: "bad_sig",
      webhookSecret: "whsec_test",
      rawBody: "{}",
      constructEvent: () => {
        throw new Error("invalid signature");
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "INVALID_SIGNATURE",
    });
  });

  it("returns success for valid mocked signature flow", async () => {
    const result = await validateStripeWebhookEvent({
      signature: "valid_sig",
      webhookSecret: "whsec_test",
      rawBody: '{"id":"evt_123"}',
      constructEvent: () => ({ id: "evt_123", type: "checkout.session.completed" }),
    });

    expect(result).toEqual({
      ok: true,
      event: { id: "evt_123", type: "checkout.session.completed" },
    });
  });
});
