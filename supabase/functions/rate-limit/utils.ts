export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  confession_create: { maxAttempts: 20, windowMs: 60_000 },
  comment_create: { maxAttempts: 40, windowMs: 60_000 },
  message_send: { maxAttempts: 60, windowMs: 60_000 },
  login: { maxAttempts: 20, windowMs: 60_000 },
  ai_request: { maxAttempts: 15, windowMs: 60_000 },
  ai_response_free: { maxAttempts: 10, windowMs: 60_000 },
  ai_response_vip: { maxAttempts: 30, windowMs: 60_000 },
  report_confession: { maxAttempts: 5, windowMs: 5 * 60_000 },
  auth_login: { maxAttempts: 20, windowMs: 60_000 },
  auth_signup: { maxAttempts: 10, windowMs: 5 * 60_000 },
  auth_refresh: { maxAttempts: 60, windowMs: 60_000 },
  auth_password_reset: { maxAttempts: 10, windowMs: 5 * 60_000 },
  default: { maxAttempts: 100, windowMs: 60_000 },
};

const ACTION_REGEX = /[^a-z0-9_:-]/g;
const IDENTIFIER_REGEX = /[^a-zA-Z0-9:._-]/g;
const HASH_IDENTIFIER_REGEX = /[^a-f0-9]/g;
const LOGIN_ACTIONS = new Set(["login", "auth_login"]);

export type NormalizeRateLimitError =
  | "INVALID_JSON"
  | "MISSING_ACTION"
  | "MISSING_IDENTIFIER";

export interface RateLimitIdentifier {
  value: string;
  type: "user" | "ip";
}

export interface NormalizedRateLimitRequest {
  action: string;
  identifiers: RateLimitIdentifier[];
  config: RateLimitConfig;
}

const sanitizeAction = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(ACTION_REGEX, "").slice(0, 64) || null;
};

const sanitizeIdentifier = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(IDENTIFIER_REGEX, "").slice(0, 128) || null;
};

const sanitizeHashIdentifier = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const sanitized = trimmed.replace(HASH_IDENTIFIER_REGEX, "");
  if (sanitized.length !== 64) return null;
  return sanitized;
};

export const normalizeRateLimitRequest = (
  value: unknown,
): { ok: true; data: NormalizedRateLimitRequest } | { ok: false; error: NormalizeRateLimitError } => {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "INVALID_JSON" };
  }

  const body = value as { action?: unknown; userId?: unknown; ip?: unknown; loginIdentifierHash?: unknown };
  const action = sanitizeAction(body.action);
  if (!action) {
    return { ok: false, error: "MISSING_ACTION" };
  }

  const userId = LOGIN_ACTIONS.has(action)
    ? null
    : sanitizeIdentifier(body.userId);
  const ip = sanitizeIdentifier(body.ip);
  const loginIdentifierHash = LOGIN_ACTIONS.has(action)
    ? sanitizeHashIdentifier(body.loginIdentifierHash)
    : null;

  const identifiers: RateLimitIdentifier[] = [];
  if (loginIdentifierHash) {
    identifiers.push({ value: loginIdentifierHash, type: "user" });
  }
  if (userId) {
    identifiers.push({ value: userId, type: "user" });
  }
  if (ip) {
    identifiers.push({ value: ip, type: "ip" });
  }

  if (identifiers.length === 0) {
    return { ok: false, error: "MISSING_IDENTIFIER" };
  }

  const config = RATE_LIMIT_CONFIGS[action] ?? RATE_LIMIT_CONFIGS.default;

  return {
    ok: true,
    data: {
      action,
      identifiers,
      config,
    },
  };
};
