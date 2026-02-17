export interface AiProfileRecord {
  subscription_tier?: string | null;
  is_premium?: boolean | null;
  trial_active?: boolean | null;
  trial_premium_ends_at?: string | null;
}

export const isVipFromProfile = (
  profile: AiProfileRecord | null | undefined,
  nowMs = Date.now(),
): boolean => {
  const subscriptionTier = (profile?.subscription_tier ?? "free").toLowerCase();
  const trialValid = Boolean(
    profile?.trial_active &&
      profile?.trial_premium_ends_at &&
      new Date(profile.trial_premium_ends_at).getTime() > nowMs,
  );

  return subscriptionTier === "vip" || trialValid || (profile?.is_premium === true && subscriptionTier !== "free");
};

export const getAiModelForTier = (isVipServer: boolean): string =>
  isVipServer ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite";

export const getRateLimitActionForTier = (isVipServer: boolean): string =>
  isVipServer ? "ai_response_vip" : "ai_response_free";

export const resolveServerAiAccess = (
  profile: AiProfileRecord | null | undefined,
  _clientIsVip?: boolean,
  nowMs = Date.now(),
): { isVipServer: boolean; model: string; rateLimitAction: string } => {
  const isVipServer = isVipFromProfile(profile, nowMs);

  return {
    isVipServer,
    model: getAiModelForTier(isVipServer),
    rateLimitAction: getRateLimitActionForTier(isVipServer),
  };
};
