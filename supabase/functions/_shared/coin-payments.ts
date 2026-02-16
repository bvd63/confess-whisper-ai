export interface CoinCheckoutSessionLike {
  id: string;
  payment_status?: string | null;
  metadata?: Record<string, string | undefined> | null;
}

export interface ParsedCoinPurchase {
  userId: string;
  coins: number;
  packageId: string | null;
}

export const buildSessionMarker = (sessionId: string): string => `Session: ${sessionId}`;

export const parseCoinPurchaseFromSession = (
  session: CoinCheckoutSessionLike,
  expectedUserId?: string,
): { ok: true; data: ParsedCoinPurchase } | { ok: false; error: string } => {
  if (!session || !session.id) {
    return { ok: false, error: "INVALID_SESSION" };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "PAYMENT_NOT_COMPLETED" };
  }

  const userId = session.metadata?.user_id?.trim();
  const coinsRaw = session.metadata?.coins ?? "";
  const packageId = session.metadata?.package_id?.trim() ?? null;
  const coins = Number.parseInt(coinsRaw, 10);

  if (!userId || Number.isNaN(coins) || coins <= 0) {
    return { ok: false, error: "INVALID_PURCHASE_METADATA" };
  }

  if (expectedUserId && userId !== expectedUserId) {
    return { ok: false, error: "FORBIDDEN_USER_MISMATCH" };
  }

  return {
    ok: true,
    data: {
      userId,
      coins,
      packageId,
    },
  };
};

export const hasExistingCoinAward = async (
  supabaseAdmin: any,
  userId: string,
  sessionId: string,
): Promise<{ exists: boolean; error?: string }> => {
  const marker = buildSessionMarker(sessionId);
  const { data, error } = await supabaseAdmin
    .from("coin_transactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("description", `%${marker}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { exists: false, error: error.message ?? "duplicate_check_failed" };
  }

  return { exists: Boolean(data) };
};

export const awardPurchasedCoins = async (
  supabaseAdmin: any,
  {
    userId,
    coins,
    sessionId,
    description,
  }: {
    userId: string;
    coins: number;
    sessionId: string;
    description: string;
  },
) => {
  return supabaseAdmin.rpc("award_coins", {
    p_user_id: userId,
    p_amount: coins,
    p_session_id: sessionId,
    p_description: `${description} - ${buildSessionMarker(sessionId)}`,
  });
};
