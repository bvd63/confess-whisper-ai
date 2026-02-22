import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { syncSubscriptionFromCheckoutSession } from "../../supabase/functions/_shared/subscription-payments";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const createSupabaseAdmin = (profile: {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_tier: string | null;
  subscription_ends_at: string | null;
}) => {
  const maybeSingle = vi.fn(async () => ({ data: profile, error: null }));
  const updateSpy = vi.fn();

  return {
    supabaseAdmin: {
      from: vi.fn((_table: string) => ({
        select: vi.fn((_columns: string) => ({
          eq: vi.fn((_column: string, _value: string) => ({
            maybeSingle,
          })),
        })),
        update: updateSpy,
      })),
    },
    updateSpy,
  };
};

describe("billing-confirm ownership hardening", () => {
  it("rejects mismatched Stripe session ownership and performs no profile writes", async () => {
    const { supabaseAdmin, updateSpy } = createSupabaseAdmin({
      stripe_customer_id: "cus_expected",
      stripe_subscription_id: "sub_123",
      subscription_tier: "vip",
      subscription_ends_at: null,
    });

    const subscriptionsRetrieve = vi.fn();
    const stripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue({
            customer: "cus_other",
            client_reference_id: "user-1",
            payment_status: "paid",
            subscription: "sub_123",
            metadata: { user_id: "user-1" },
          }),
        },
      },
      subscriptions: {
        retrieve: subscriptionsRetrieve,
      },
    };

    const result = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId: "cs_test_1",
      userId: "user-1",
      vipMonthlyPriceId: "price_vip_monthly",
      vipYearlyPriceId: "price_vip_yearly",
    });

    expect(result).toMatchObject({
      success: false,
      forbidden: true,
      ownershipVerified: false,
      error: "FORBIDDEN_SESSION_OWNERSHIP",
    });
    expect(subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("accepts correct ownership but leaves entitlement updates to webhook reconciliation", async () => {
    const { supabaseAdmin, updateSpy } = createSupabaseAdmin({
      stripe_customer_id: "cus_owner",
      stripe_subscription_id: null,
      subscription_tier: "free",
      subscription_ends_at: null,
    });

    const stripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue({
            customer: "cus_owner",
            client_reference_id: "user-2",
            payment_status: "paid",
            subscription: "sub_live_123",
            metadata: { user_id: "user-2" },
          }),
        },
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_live_123",
          status: "active",
          current_period_end: 1_900_000_000,
          items: {
            data: [
              {
                price: {
                  id: "price_vip_monthly",
                },
              },
            ],
          },
        }),
      },
    };

    const result = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId: "cs_test_2",
      userId: "user-2",
      vipMonthlyPriceId: "price_vip_monthly",
      vipYearlyPriceId: "price_vip_yearly",
    });

    expect(result.success).toBe(true);
    expect(result.ownershipVerified).toBe(true);
    expect(result.alreadyUpdated).toBe(false);
    expect(result.tier).toBe("free");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("is idempotent for repeated confirms and keeps billing-confirm read-only", async () => {
    const { supabaseAdmin, updateSpy } = createSupabaseAdmin({
      stripe_customer_id: "cus_owner",
      stripe_subscription_id: "sub_live_abc",
      subscription_tier: "vip",
      subscription_ends_at: "2030-01-01T00:00:00.000Z",
    });

    const stripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockResolvedValue({
            customer: "cus_owner",
            client_reference_id: "user-3",
            payment_status: "paid",
            subscription: "sub_live_abc",
            metadata: { user_id: "user-3" },
          }),
        },
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_live_abc",
          status: "active",
          current_period_end: 1_900_000_000,
          items: {
            data: [
              {
                price: {
                  id: "price_vip_monthly",
                },
              },
            ],
          },
        }),
      },
    };

    const first = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId: "cs_test_3",
      userId: "user-3",
      vipMonthlyPriceId: "price_vip_monthly",
      vipYearlyPriceId: "price_vip_yearly",
    });
    const second = await syncSubscriptionFromCheckoutSession({
      stripe,
      supabaseAdmin,
      sessionId: "cs_test_3",
      userId: "user-3",
      vipMonthlyPriceId: "price_vip_monthly",
      vipYearlyPriceId: "price_vip_yearly",
    });

    expect(first).toMatchObject({ success: true, alreadyUpdated: true, tier: "vip" });
    expect(second).toMatchObject({ success: true, alreadyUpdated: true, tier: "vip" });
    expect(updateSpy).not.toHaveBeenCalled();

    const billingConfirmSource = read("supabase/functions/billing-confirm/index.ts");
    expect(billingConfirmSource).toContain("FORBIDDEN_SESSION_OWNERSHIP");
    expect(billingConfirmSource).toContain("awaiting_webhook_reconciliation");
    expect(billingConfirmSource).not.toContain('.from("profiles")');
    expect(billingConfirmSource).not.toContain(".update(");

    const sharedSource = read("supabase/functions/_shared/subscription-payments.ts");
    expect(sharedSource).toContain("verifyCheckoutSessionOwnership");
    expect(sharedSource).not.toContain(".update({");
  });
});
