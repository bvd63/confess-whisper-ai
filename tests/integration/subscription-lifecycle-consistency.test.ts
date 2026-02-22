import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

const CHECKOUT_ENDPOINTS = [
  "supabase/functions/create-checkout/index.ts",
  "supabase/functions/create-checkout-session/index.ts",
  "supabase/functions/billing-buy/index.ts",
];

const MANAGE_ENDPOINTS = [
  "supabase/functions/billing-upgrade/index.ts",
  "supabase/functions/subscription-upgrade/index.ts",
  "supabase/functions/billing-change/index.ts",
  "supabase/functions/billing-reactivate/index.ts",
];

describe("subscription lifecycle consistency", () => {
  it("uses one shared lifecycle resolver across checkout/billing endpoints", () => {
    const files = [
      ...CHECKOUT_ENDPOINTS,
      ...MANAGE_ENDPOINTS,
      "supabase/functions/customer-portal/index.ts",
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain("resolveSubscriptionLifecycleState");
    }
  });

  it("applies consistent active/trialing + payment-action guards for checkout entrypoints", () => {
    const shared = read("supabase/functions/_shared/subscription-lifecycle.ts");

    expect(shared).toContain('export const ACTIVE_OR_TRIALING_STATUSES = new Set(["active", "trialing"]);');
    expect(shared).toContain('"incomplete"');
    expect(shared).toContain('"incomplete_expired"');
    expect(shared).toContain('"past_due"');
    expect(shared).toContain("code: \"ALREADY_SUBSCRIBED\"");
    expect(shared).toContain("code: \"SUBSCRIPTION_PAYMENT_ACTION_REQUIRED\"");

    for (const file of CHECKOUT_ENDPOINTS) {
      const source = read(file);
      expect(source).toContain("getCheckoutLifecycleBlock");
      expect(source).toContain("useCustomerPortal");
    }
  });

  it("blocks payment-problem statuses for manage endpoints and directs users to portal", () => {
    for (const file of MANAGE_ENDPOINTS) {
      const source = read(file);
      expect(source).toContain("getManageLifecycleBlock");
      expect(source).toContain("code: lifecycleBlock.code");
      expect(source).toContain("portalUrl");
    }
  });

  it("avoids optimistic profile entitlement writes in checkout/change/upgrade endpoints", () => {
    const files = [
      ...CHECKOUT_ENDPOINTS,
      ...MANAGE_ENDPOINTS,
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain("subscription_tier:");
      expect(source).not.toContain("is_premium:");
      expect(source).not.toContain("subscription_status: \"active\"");
    }
  });

  it("keeps webhook subscription status mapping aligned with shared lifecycle statuses", () => {
    const webhook = read("supabase/functions/stripe-webhook-subscriptions/index.ts");

    expect(webhook).toContain("ACTIVE_OR_TRIALING_STATUSES as VIP_ACTIVE_STATUSES");
    expect(webhook).toContain("FREE_SUBSCRIPTION_STATUSES as FREE_STATUSES");
    expect(webhook).toContain("if (FREE_STATUSES.has(status)) return false;");
    expect(webhook).toContain("if (VIP_ACTIVE_STATUSES.has(status)) return true;");
  });
});
