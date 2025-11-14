export const SUPPORTED_CATEGORIES = new Set([
  "relationships",
  "work",
  "family",
  "health",
  "money",
  "other",
]);

const SCRIPT_TAG_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const MAX_CONTENT_LENGTH = 2000;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_MOOD_LENGTH = 64;
const MAX_CAPTCHA_LENGTH = 1024;

export const sanitizeBasic = (input: string): string =>
  input
    .replace(/[\0\r]/g, " ")
    .replace(SCRIPT_TAG_REGEX, "")
    .trim();

export const sanitizeDisplayName = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const sanitized = input.replace(/[^a-zA-Z0-9_@\-\s]/g, "").slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return sanitized.length > 0 ? sanitized : null;
};

export const clampIntensity = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(10, Math.max(0, Math.round(value)));
};

export const normalizeCategory = (value: unknown): string => {
  if (typeof value !== "string") return "other";
  const normalized = value.toLowerCase();
  return SUPPORTED_CATEGORIES.has(normalized) ? normalized : "other";
};

export interface NormalizedMood {
  mood?: string;
  intensity: number | null;
}

export interface NormalizedCreateConfessionPayload {
  content: string;
  contentLength: number;
  originalContentLength: number;
  category: string;
  communityId: string | null;
  imageUrl: string | null;
  isAnonymous: boolean;
  aiResponse: string | null;
  mood: NormalizedMood | null;
  captchaToken: string | null;
  authorDisplayName: string | null;
}

export type NormalizeCreateConfessionError =
  | {
    code: "INVALID_CONTENT";
    logReason: "missing_content";
    context?: Record<string, unknown>;
  }
  | {
    code: "CONTENT_TOO_SHORT";
    logReason: "content_too_short";
    context: { originalLength: number; sanitizedLength: number };
  };

const normalizeMood = (value: unknown): NormalizedMood | null => {
  if (!value || typeof value !== "object") return null;
  const moodValue = typeof (value as { mood?: unknown }).mood === "string"
    ? (value as { mood?: string }).mood.slice(0, MAX_MOOD_LENGTH)
    : undefined;
  const intensityRaw = (value as { intensity?: unknown }).intensity;
  const intensity = clampIntensity(intensityRaw ?? null);
  if (moodValue === undefined && intensity === null) {
    return null;
  }
  return { mood: moodValue, intensity };
};

const sanitizeOptionalString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const normalizeCreateConfessionPayload = (
  value: unknown,
): { ok: true; data: NormalizedCreateConfessionPayload } | { ok: false; error: NormalizeCreateConfessionError } => {
  if (!value || typeof value !== "object") {
    return { ok: false, error: { code: "INVALID_CONTENT", logReason: "missing_content" } };
  }

  const body = value as Record<string, unknown>;
  const contentRaw = body.content;

  if (typeof contentRaw !== "string") {
    return { ok: false, error: { code: "INVALID_CONTENT", logReason: "missing_content" } };
  }

  const originalLength = contentRaw.length;
  const sanitizedContent = sanitizeBasic(contentRaw).slice(0, MAX_CONTENT_LENGTH);
  const sanitizedLength = sanitizedContent.length;

  if (sanitizedLength < 10) {
    return {
      ok: false,
      error: {
        code: "CONTENT_TOO_SHORT",
        logReason: "content_too_short",
        context: { originalLength, sanitizedLength },
      },
    };
  }

  const isAnonymous = body.isAnonymous !== false;
  const authorDisplayName = isAnonymous ? null : sanitizeDisplayName(body.authorDisplayName as string | null | undefined);
  const captchaToken = sanitizeOptionalString(body.captchaToken, MAX_CAPTCHA_LENGTH);

  return {
    ok: true,
    data: {
      content: sanitizedContent,
      contentLength: sanitizedLength,
      originalContentLength: originalLength,
      category: normalizeCategory(body.category),
      communityId: typeof body.communityId === "string" ? body.communityId : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      isAnonymous,
      aiResponse: typeof body.aiResponse === "string"
        ? sanitizeBasic(body.aiResponse).slice(0, MAX_CONTENT_LENGTH)
        : null,
      mood: normalizeMood(body.mood),
      captchaToken,
      authorDisplayName,
    },
  };
};
