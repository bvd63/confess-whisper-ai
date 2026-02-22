export const buildSubscriptionBonusIdempotencyKey = ({
  userId,
  tier,
  subscriptionId,
  subscriptionEndsAt,
}: {
  userId: string;
  tier: string;
  subscriptionId: string | null;
  subscriptionEndsAt: string | null;
}): string => {
  const normalizedTier = tier.trim().toLowerCase();
  const normalizedSubscriptionId = (subscriptionId ?? "").trim() || "no_subscription";
  const normalizedPeriod = (subscriptionEndsAt ?? "").trim() || "no_period";
  return `subscription_bonus:${userId}:${normalizedTier}:${normalizedSubscriptionId}:${normalizedPeriod}`;
};

export const stableUuidFromString = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest).slice(0, 16);

  // RFC 4122 variant + version bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

export const isDuplicateCoinTransactionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string | number; message?: string };
  const code = err.code !== undefined ? String(err.code) : "";
  const message = (err.message ?? "").toLowerCase();
  return code === "23505" || code === "unique_violation" || message.includes("duplicate key value");
};
