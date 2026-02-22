import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureStripeCustomerId,
  resolveSubscriptionLifecycleState,
} from "../../supabase/functions/_shared/subscription-lifecycle";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const ENDPOINTS_REQUIRING_PROFILE_CUSTOMER_SOURCE = [
  "supabase/functions/create-trial-checkout/index.ts",
  "supabase/functions/get-subscription-status/index.ts",
  "supabase/functions/create-coin-checkout/index.ts",
  "supabase/functions/billing-preview/index.ts",
];

const createProfileStore = (initialCustomerId: string | null) => {
  const state = {
    stripeCustomerId: initialCustomerId,
    selectCalls: 0,
    updateCalls: 0,
  };

  const supabase = {
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: (_columns: string) => ({
          eq: (_column: string, _value: string) => ({
            maybeSingle: async () => {
              state.selectCalls += 1;
              return {
                data: { stripe_customer_id: state.stripeCustomerId },
                error: null,
              };
            },
          }),
        }),
        update: (payload: { stripe_customer_id: string }) => ({
          eq: (_column: string, _value: string) => ({
            is: async (_columnName: string, _nullValue: null) => {
              state.updateCalls += 1;
              if (state.stripeCustomerId === null) {
                state.stripeCustomerId = payload.stripe_customer_id;
              }
              return { error: null };
            },
          }),
        }),
      };
    },
  };

  return { supabase, state };
};

describe("stripe customer resolution hardening", () => {
  it("creates and persists stripe_customer_id when profile value is missing", async () => {
    const store = createProfileStore(null);
    const createCustomer = vi.fn().mockResolvedValue({ id: "cus_new_123" });
    const listByEmail = vi.fn();
    const stripe = {
      customers: {
        create: createCustomer,
        list: listByEmail,
      },
    };

    const customerId = await ensureStripeCustomerId({
      stripe,
      supabase: store.supabase,
      profileUserId: "user-1",
      profileEmail: "user@example.com",
      customerIdHint: null,
    });

    expect(customerId).toBe("cus_new_123");
    expect(store.state.stripeCustomerId).toBe("cus_new_123");
    expect(store.state.updateCalls).toBe(1);
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createCustomer).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: {
        user_id: "user-1",
        supabase_user_id: "user-1",
      },
    });
    expect(listByEmail).not.toHaveBeenCalled();
  });

  it("uses existing persisted stripe_customer_id without creating a new customer", async () => {
    const store = createProfileStore("cus_existing_456");
    const createCustomer = vi.fn();
    const stripe = {
      customers: {
        create: createCustomer,
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
    };

    const lifecycle = await resolveSubscriptionLifecycleState({
      stripe,
      supabase: store.supabase,
      profileUserId: "user-2",
      profileEmail: "user2@example.com",
      customerIdHint: null,
    });

    expect(lifecycle.customerId).toBe("cus_existing_456");
    expect(lifecycle.category).toBe("none");
    expect(lifecycle.checkoutEligible).toBe(true);
    expect(store.state.updateCalls).toBe(0);
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("removes webhook email fallback and keeps idempotent customer-id backfill guard", () => {
    const lifecycleSource = read("supabase/functions/_shared/subscription-lifecycle.ts");
    const webhookSource = read("supabase/functions/stripe-webhook-subscriptions/index.ts");

    expect(lifecycleSource).not.toContain("stripe.customers.list({ email");
    expect(webhookSource).not.toContain('.eq("email"');
    expect(webhookSource).not.toContain("customer_email");
    expect(webhookSource).toContain('.is("stripe_customer_id", null)');
    expect(webhookSource).toContain("Stable reference customer mismatch; refusing ownership reassignment");
  });

  it("ensures remaining checkout/status endpoints do not use email-based customer lookup", () => {
    for (const file of ENDPOINTS_REQUIRING_PROFILE_CUSTOMER_SOURCE) {
      const source = read(file);

      expect(source).toContain("ensureStripeCustomerId");
      expect(source).not.toContain("customers.list({ email");
    }
  });
});
