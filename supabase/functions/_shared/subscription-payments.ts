export interface SyncSubscriptionResult {
  success: boolean;
  processing?: boolean;
  ownershipVerified?: boolean;
  forbidden?: boolean;
  alreadyUpdated?: boolean;
  tier?: "vip" | "free";
  cadence?: "monthly" | "yearly";
  subscriptionEnd?: string | null;
  status?: string | null;
  error?: string;
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const getSessionCustomerId = (session: any): string | null => {
  const customer = session?.customer;
  if (typeof customer === "string") return normalizeString(customer);
  if (typeof customer?.id === "string") return normalizeString(customer.id);
  return null;
};

const getSessionStableUserReference = (session: any): string | null => {
  const clientReference = normalizeString(session?.client_reference_id);
  if (clientReference) return clientReference;

  const metadataUserId = normalizeString(session?.metadata?.user_id);
  if (metadataUserId) return metadataUserId;

  // Backwards-compatible support for older metadata key.
  const legacyMetadataUserId = normalizeString(session?.metadata?.userId);
  if (legacyMetadataUserId) return legacyMetadataUserId;

  return null;
};

export interface CheckoutSessionOwnershipResult {
  verified: boolean;
  sessionCustomerId: string | null;
  profileCustomerId: string | null;
  stableUserReference: string | null;
  matchesCustomer: boolean;
  matchesStableRef: boolean;
}

export const verifyCheckoutSessionOwnership = ({
  session,
  profileCustomerId,
  userId,
}: {
  session: any;
  profileCustomerId: string | null | undefined;
  userId: string;
}): CheckoutSessionOwnershipResult => {
  const normalizedProfileCustomerId = normalizeString(profileCustomerId);
  const sessionCustomerId = getSessionCustomerId(session);
  const stableUserReference = getSessionStableUserReference(session);

  const matchesCustomer = Boolean(
    sessionCustomerId &&
      normalizedProfileCustomerId &&
      sessionCustomerId === normalizedProfileCustomerId,
  );
  const matchesStableRef = Boolean(stableUserReference && stableUserReference === userId);

  return {
    verified: matchesCustomer && matchesStableRef,
    sessionCustomerId,
    profileCustomerId: normalizedProfileCustomerId,
    stableUserReference,
    matchesCustomer,
    matchesStableRef,
  };
};

export const deriveTierAndCadence = (
  priceId: string,
  vipMonthlyPriceId: string,
  vipYearlyPriceId: string,
): { tier: "vip" | "free"; cadence: "monthly" | "yearly" } => {
  if (priceId === vipYearlyPriceId) {
    return { tier: "vip", cadence: "yearly" };
  }
  if (priceId === vipMonthlyPriceId) {
    return { tier: "vip", cadence: "monthly" };
  }
  return { tier: "free", cadence: "monthly" };
};

export const syncSubscriptionFromCheckoutSession = async ({
  stripe,
  supabaseAdmin,
  sessionId,
  userId,
  vipMonthlyPriceId,
  vipYearlyPriceId,
}: {
  stripe: any;
  supabaseAdmin: any;
  sessionId: string;
  userId: string;
  vipMonthlyPriceId: string;
  vipYearlyPriceId: string;
}): Promise<SyncSubscriptionResult> => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  const { data: currentProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError || !currentProfile) {
    return { success: false, error: "PROFILE_LOOKUP_FAILED" };
  }

  const ownership = verifyCheckoutSessionOwnership({
    session,
    profileCustomerId: currentProfile.stripe_customer_id,
    userId,
  });
  if (!ownership.verified) {
    return {
      success: false,
      forbidden: true,
      ownershipVerified: false,
      error: "FORBIDDEN_SESSION_OWNERSHIP",
    };
  }

  if (session.payment_status !== "paid") {
    return {
      success: false,
      processing: true,
      ownershipVerified: true,
      status: session.payment_status,
    };
  }

  if (!session.subscription) {
    return {
      success: false,
      processing: true,
      ownershipVerified: true,
      status: session.payment_status,
      error: "MISSING_SUBSCRIPTION",
    };
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    return { success: false, ownershipVerified: true, error: "MISSING_PRICE_ID" };
  }

  const plan = deriveTierAndCadence(priceId, vipMonthlyPriceId, vipYearlyPriceId);
  const currentPeriodEnd = typeof currentProfile.subscription_ends_at === "string" && currentProfile.subscription_ends_at
    ? currentProfile.subscription_ends_at
    : (subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null);

  const currentTier = currentProfile.subscription_tier === "vip" ? "vip" : "free";
  const currentSubscriptionId = normalizeString(currentProfile.stripe_subscription_id);

  const alreadyUpdated =
    currentSubscriptionId === subscriptionId &&
    currentTier === plan.tier;

  return {
    success: true,
    ownershipVerified: true,
    alreadyUpdated,
    tier: currentTier,
    cadence: plan.cadence,
    subscriptionEnd: currentPeriodEnd,
    status: subscription.status,
  };
};
