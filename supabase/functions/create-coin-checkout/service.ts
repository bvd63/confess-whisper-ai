export interface CoinPackageRecord {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
}

export interface CoinCheckoutRepositories {
  getActivePackage: (packageId: string) => Promise<CoinPackageRecord | null>;
}

export interface StripeCustomerLookupResult {
  id: string;
}

export interface StripeService {
  findCustomerIdByEmail: (email: string) => Promise<string | undefined>;
  createCheckoutSession: (payload: StripeCheckoutPayload) => Promise<{ id: string; url: string | null }>;
}

export interface StripeCheckoutPayload {
  customer?: string;
  customer_email?: string;
  line_items: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: {
        name: string;
        description: string;
      };
    };
    quantity: number;
  }>;
  mode: "payment";
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
}

export interface LoggerLike {
  debug?: (message: string, context?: Record<string, unknown>) => void;
  info?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, context?: Record<string, unknown>) => void;
  error?: (message: string, context?: Record<string, unknown>) => void;
  metric?: (name: string, value: number, context?: Record<string, unknown>) => void;
}

export interface CreateCoinCheckoutInput {
  packageId: string;
  userId: string;
  userEmail: string;
  origin: string;
}

export interface CreateCoinCheckoutDeps {
  repositories: CoinCheckoutRepositories;
  stripe: StripeService;
  logger?: LoggerLike;
}

const noop = () => {};
const defaultLogger: Required<LoggerLike> = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  metric: noop,
};

const buildLogger = (logger?: LoggerLike): Required<LoggerLike> => ({
  debug: logger?.debug ?? noop,
  info: logger?.info ?? noop,
  warn: logger?.warn ?? noop,
  error: logger?.error ?? noop,
  metric: logger?.metric ?? noop,
});

export class CoinCheckoutError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const createCoinCheckoutSession = async (
  deps: CreateCoinCheckoutDeps,
  input: CreateCoinCheckoutInput,
) => {
  const logger = buildLogger(deps.logger);
  logger.debug("Fetching coin package", { packageId: input.packageId });

  const coinPackage = await deps.repositories.getActivePackage(input.packageId);

  if (!coinPackage) {
    logger.warn("Coin package not found", { packageId: input.packageId });
    throw new CoinCheckoutError("COIN_PACKAGE_NOT_FOUND", "Coin package not found or inactive");
  }

  logger.info("Coin package resolved", {
    packageId: coinPackage.id,
    coins: coinPackage.coins,
    price: coinPackage.price_usd,
  });

  const customerId = await deps.stripe.findCustomerIdByEmail(input.userEmail);

  if (customerId) {
    logger.debug("Stripe customer found", { customerId });
  } else {
    logger.debug("Stripe customer not found, will use email", { email: input.userEmail });
  }

  const successUrl = `${input.origin || ""}/home?coin_purchase=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${input.origin || ""}/?coin_purchase=cancel`;

  const payload: StripeCheckoutPayload = {
    customer: customerId,
    customer_email: customerId ? undefined : input.userEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(coinPackage.price_usd * 100),
          product_data: {
            name: `${coinPackage.coins} Coins`,
            description: `${coinPackage.name} Package - ${coinPackage.coins} coins`,
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: input.userId,
      package_id: coinPackage.id,
      coins: String(coinPackage.coins),
    },
  };

  const session = await deps.stripe.createCheckoutSession(payload);
  logger.metric("stripe_checkout_created", 1, { packageId: coinPackage.id });
  logger.info("Stripe checkout session created", { sessionId: session.id });

  return session;
};

type SupabaseQuery<T> = {
  eq: (column: string, value: unknown) => SupabaseQuery<T>;
  single: () => Promise<{ data: T | null; error: { message: string } | null }>;
};

export const createCoinCheckoutRepositories = (client: {
  from: (table: string) => {
    select: (columns: string) => SupabaseQuery<CoinPackageRecord>;
  };
}) => ({
  async getActivePackage(packageId: string) {
    const query = client
      .from("coin_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true);

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return data;
  },
});

export const createStripeService = (stripe: {
  customers: { list: (args: { email: string; limit: number }) => Promise<{ data: Array<{ id: string }> }> };
  checkout: { sessions: { create: (payload: StripeCheckoutPayload) => Promise<{ id: string; url: string | null }> } };
}) => ({
  async findCustomerIdByEmail(email: string) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    return customers.data[0]?.id;
  },
  async createCheckoutSession(payload: StripeCheckoutPayload) {
    return stripe.checkout.sessions.create(payload);
  },
});
