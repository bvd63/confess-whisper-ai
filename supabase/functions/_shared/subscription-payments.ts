export interface SyncSubscriptionResult {
  success: boolean;
  processing?: boolean;
  alreadyUpdated?: boolean;
  tier?: "vip" | "free";
  cadence?: "monthly" | "yearly";
  subscriptionEnd?: string | null;
  status?: string | null;
  error?: string;
}

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

  if (session.payment_status !== "paid") {
    return {
      success: false,
      processing: true,
      status: session.payment_status,
    };
  }

  if (!session.subscription) {
    return {
      success: false,
      processing: true,
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
    return { success: false, error: "MISSING_PRICE_ID" };
  }

  const plan = deriveTierAndCadence(priceId, vipMonthlyPriceId, vipYearlyPriceId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const { data: currentProfile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_subscription_id, subscription_tier")
    .eq("user_id", userId)
    .single();

  if (
    currentProfile?.stripe_subscription_id === subscriptionId &&
    currentProfile?.subscription_tier === plan.tier
  ) {
    return {
      success: true,
      alreadyUpdated: true,
      tier: plan.tier,
      cadence: plan.cadence,
      subscriptionEnd: currentPeriodEnd,
      status: subscription.status,
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: plan.tier,
      subscription_cadence: plan.cadence,
      subscription_status: subscription.status,
      subscription_ends_at: currentPeriodEnd,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
      is_premium: plan.tier === "vip",
    })
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: updateError.message ?? "PROFILE_UPDATE_FAILED" };
  }

  return {
    success: true,
    tier: plan.tier,
    cadence: plan.cadence,
    subscriptionEnd: currentPeriodEnd,
    status: subscription.status,
  };
};
