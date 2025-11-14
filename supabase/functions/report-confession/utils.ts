export const ALLOWED_REASONS = new Set([
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "adult_content",
  "misinformation",
  "personal_info",
  "other",
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sanitizeDetails = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 1000);
};

export const isValidUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_REGEX.test(value);

export const normalizeReason = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return ALLOWED_REASONS.has(normalized) ? normalized : null;
};

export const normalizeLanguage = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/[^a-z-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.slice(0, 5);
  return normalized || null;
};

export interface NormalizedReportPayload {
  confessionId: string;
  reason: string;
  details: string | null;
  language: string | null;
}

export type ReportPayloadError = "INVALID_CONFESSION" | "INVALID_REASON";

export const normalizeReportPayload = (
  value: unknown,
): { ok: true; data: NormalizedReportPayload } | { ok: false; error: ReportPayloadError } => {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "INVALID_CONFESSION" };
  }

  const { confessionId, reason, details, language } = value as {
    confessionId?: unknown;
    reason?: unknown;
    details?: unknown;
    language?: unknown;
  };

  if (!isValidUuid(confessionId)) {
    return { ok: false, error: "INVALID_CONFESSION" };
  }

  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return { ok: false, error: "INVALID_REASON" };
  }

  return {
    ok: true,
    data: {
      confessionId,
      reason: normalizedReason,
      details: sanitizeDetails(details),
      language: normalizeLanguage(language),
    },
  };
};
