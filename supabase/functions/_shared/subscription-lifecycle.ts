export const ACTIVE_OR_TRIALING_STATUSES = new Set(["active", "trialing"]);
export const PAYMENT_ACTION_REQUIRED_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
  "past_due",
  "unpaid",
]);
export const FREE_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  ...PAYMENT_ACTION_REQUIRED_STATUSES,
]);

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  trialing: 0,
  past_due: 1,
  incomplete: 1,
  incomplete_expired: 1,
  unpaid: 1,
  canceled: 2,
};

export type SubscriptionLifecycleCategory =
  | "none"
  | "active_or_trialing"
  | "payment_action_required"
  | "canceled_or_ended"
  | "other";

export interface SubscriptionLifecycleState {
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  category: SubscriptionLifecycleCategory;
  checkoutEligible: boolean;
  shouldUsePortal: boolean;
}

export interface SubscriptionLifecycleBlock {
  code: "ALREADY_SUBSCRIBED" | "SUBSCRIPTION_PAYMENT_ACTION_REQUIRED";
  message: string;
  status: number;
  requiresPortal: boolean;
}

interface EnsureStripeCustomerIdInput {
  stripe: any;
  supabase: any;
  profileUserId: string;
  profileEmail?: string | null;
  customerIdHint?: string | null;
}

const normalizeStatus = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const resolveCategory = (status: string | null): SubscriptionLifecycleCategory => {
  if (!status) return "none";
  if (ACTIVE_OR_TRIALING_STATUSES.has(status)) return "active_or_trialing";
  if (PAYMENT_ACTION_REQUIRED_STATUSES.has(status)) return "payment_action_required";
  if (status === "canceled") return "canceled_or_ended";
  return "other";
};

const pickPrimarySubscription = (subscriptions: any[]): any | null => {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) return null;

  let chosen = subscriptions[0];
  let chosenPriority = STATUS_PRIORITY[normalizeStatus(chosen?.status) ?? ""] ?? 999;
  let chosenCreated = typeof chosen?.created === "number" ? chosen.created : 0;

  for (const candidate of subscriptions.slice(1)) {
    const candidateStatus = normalizeStatus(candidate?.status) ?? "";
    const candidatePriority = STATUS_PRIORITY[candidateStatus] ?? 999;
    const candidateCreated = typeof candidate?.created === "number" ? candidate.created : 0;

    if (
      candidatePriority < chosenPriority ||
      (candidatePriority === chosenPriority && candidateCreated > chosenCreated)
    ) {
      chosen = candidate;
      chosenPriority = candidatePriority;
      chosenCreated = candidateCreated;
    }
  }

  return chosen;
};

const loadProfileCustomerId = async (
  supabase: any,
  profileUserId: string,
): Promise<string | null> => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", profileUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`PROFILE_LOOKUP_FAILED:${error.message}`);
  }

  const value = typeof profile?.stripe_customer_id === "string"
    ? profile.stripe_customer_id.trim()
    : "";
  return value || null;
};

const persistProfileCustomerIdIfMissing = async (
  supabase: any,
  profileUserId: string,
  customerId: string,
): Promise<void> => {
  // Try null first (most common case)
  const { error: nullError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", profileUserId)
    .is("stripe_customer_id", null);

  if (nullError) {
    throw new Error(`PROFILE_CUSTOMER_PERSIST_FAILED:${nullError.message}`);
  }

  // Also handle empty string case
  const { error: emptyError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", profileUserId)
    .eq("stripe_customer_id", "");

  if (emptyError) {
    throw new Error(`PROFILE_CUSTOMER_PERSIST_FAILED:${emptyError.message}`);
  }
};

export const ensureStripeCustomerId = async ({
  stripe,
  supabase,
  profileUserId,
  profileEmail,
  customerIdHint,
}: EnsureStripeCustomerIdInput): Promise<string> => {
  let customerId = customerIdHint?.trim() || null;

  if (!customerId) {
    customerId = await loadProfileCustomerId(supabase, profileUserId);
  }

  if (!customerId) {
    const createdCustomer = await stripe.customers.create({
      email: profileEmail ?? undefined,
      metadata: {
        user_id: profileUserId,
        supabase_user_id: profileUserId,
      },
    });

    const createdCustomerId = typeof createdCustomer?.id === "string" ? createdCustomer.id : null;
    if (!createdCustomerId) {
      throw new Error("STRIPE_CUSTOMER_CREATE_FAILED");
    }

    await persistProfileCustomerIdIfMissing(supabase, profileUserId, createdCustomerId);

    // Resolve race conditions by re-reading source-of-truth from profile.
    const persistedCustomerId = await loadProfileCustomerId(supabase, profileUserId);
    if (!persistedCustomerId) {
      throw new Error("PROFILE_CUSTOMER_PERSIST_VERIFICATION_FAILED");
    }
    customerId = persistedCustomerId;
  }

  return customerId;
};

export const resolveSubscriptionLifecycleState = async ({
  stripe,
  supabase,
  profileUserId,
  profileEmail,
  customerIdHint,
}: {
  stripe: any;
  supabase: any;
  profileUserId: string;
  profileEmail?: string | null;
  customerIdHint?: string | null;
}): Promise<SubscriptionLifecycleState> => {
  const customerId = await ensureStripeCustomerId({
    stripe,
    supabase,
    profileUserId,
    profileEmail,
    customerIdHint,
  });

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const primarySubscription = pickPrimarySubscription(subscriptions.data ?? []);
  const subscriptionStatus = normalizeStatus(primarySubscription?.status);
  const category = resolveCategory(subscriptionStatus);

  return {
    customerId,
    subscriptionId: typeof primarySubscription?.id === "string" ? primarySubscription.id : null,
    subscriptionStatus,
    category,
    checkoutEligible: category === "none" || category === "canceled_or_ended" || category === "other",
    shouldUsePortal: category === "active_or_trialing" || category === "payment_action_required",
  };
};

export const getCheckoutLifecycleBlock = (
  lifecycle: SubscriptionLifecycleState,
): SubscriptionLifecycleBlock | null => {
  if (lifecycle.category === "active_or_trialing") {
    return {
      code: "ALREADY_SUBSCRIBED",
      message: "You already have an active or trialing subscription. Please manage it in billing portal.",
      status: 409,
      requiresPortal: true,
    };
  }

  if (lifecycle.category === "payment_action_required") {
    return {
      code: "SUBSCRIPTION_PAYMENT_ACTION_REQUIRED",
      message: "Your subscription requires payment action. Please update your payment method in billing portal.",
      status: 409,
      requiresPortal: true,
    };
  }

  return null;
};

export const getManageLifecycleBlock = (
  lifecycle: SubscriptionLifecycleState,
): SubscriptionLifecycleBlock | null => {
  if (lifecycle.category === "payment_action_required") {
    return {
      code: "SUBSCRIPTION_PAYMENT_ACTION_REQUIRED",
      message: "Your subscription requires payment action. Please use billing portal.",
      status: 409,
      requiresPortal: true,
    };
  }
  return null;
};

export const createBillingPortalUrl = async ({
  stripe,
  customerId,
  returnUrl,
}: {
  stripe: any;
  customerId: string | null;
  returnUrl: string;
}): Promise<string | null> => {
  if (!customerId) return null;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return typeof session?.url === "string" ? session.url : null;
};
