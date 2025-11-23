import { describe, it, expect, vi } from "vitest";
import {
  createCoinCheckoutSession,
  CoinCheckoutError,
  type CreateCoinCheckoutDeps,
} from "../../supabase/functions/create-coin-checkout/service";

const buildDeps = (overrides: Partial<CreateCoinCheckoutDeps> = {}): CreateCoinCheckoutDeps => {
  const repositories = overrides.repositories ?? {
    getActivePackage: vi.fn().mockResolvedValue({
      id: "pkg_standard",
      name: "Standard",
      coins: 500,
      price_usd: 9.99,
    }),
  };

  const stripe = overrides.stripe ?? {
    findCustomerIdByEmail: vi.fn().mockResolvedValue("cus_123"),
    createCheckoutSession: vi.fn().mockResolvedValue({ id: "cs_test", url: "https://stripe.test" }),
  };

  const logger = overrides.logger ?? {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    metric: vi.fn(),
  };

  return { repositories, stripe, logger } as CreateCoinCheckoutDeps;
};

const baseInput = {
  packageId: "pkg_standard",
  userId: "user_1",
  userEmail: "user@example.com",
  origin: "https://app.example.com",
};

describe("createCoinCheckoutSession", () => {
  it("throws a typed error when the package is missing", async () => {
    const deps = buildDeps({
      repositories: {
        getActivePackage: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(createCoinCheckoutSession(deps, baseInput)).rejects.toThrowError(CoinCheckoutError);
    await expect(createCoinCheckoutSession(deps, baseInput)).rejects.toMatchObject({ code: "COIN_PACKAGE_NOT_FOUND" });
  });

  it("creates a checkout session with an existing Stripe customer", async () => {
    const stripe = {
      findCustomerIdByEmail: vi.fn().mockResolvedValue("cus_existing"),
      createCheckoutSession: vi.fn().mockResolvedValue({ id: "cs_1", url: "https://stripe/session" }),
    };
    const deps = buildDeps({ stripe });

    const session = await createCoinCheckoutSession(deps, baseInput);

    expect(session).toEqual({ id: "cs_1", url: "https://stripe/session" });
    expect(stripe.findCustomerIdByEmail).toHaveBeenCalledWith("user@example.com");
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        customer_email: undefined,
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 999,
              product_data: expect.objectContaining({ name: "500 Coins" }),
            }),
          }),
        ],
        metadata: {
          user_id: "user_1",
          package_id: "pkg_standard",
          coins: "500",
        },
      }),
    );
  });

  it("falls back to email when no customer exists", async () => {
    const stripe = {
      findCustomerIdByEmail: vi.fn().mockResolvedValue(undefined),
      createCheckoutSession: vi.fn().mockResolvedValue({ id: "cs_2", url: "https://stripe/session2" }),
    };
    const deps = buildDeps({ stripe });

    await createCoinCheckoutSession(deps, baseInput);

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: undefined,
        customer_email: "user@example.com",
      }),
    );
  });
});
