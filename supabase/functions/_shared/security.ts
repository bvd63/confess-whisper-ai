export const extractBearerToken = (authorizationHeader: string | null | undefined): string | null => {
  if (!authorizationHeader) return null;
  const trimmed = authorizationHeader.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
};

export const normalizeSecret = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const isInternalSecretValid = (
  providedSecret: string | null | undefined,
  expectedSecret: string | null | undefined,
): boolean => {
  const provided = normalizeSecret(providedSecret);
  const expected = normalizeSecret(expectedSecret);
  if (!provided || !expected) return false;
  return provided === expected;
};
