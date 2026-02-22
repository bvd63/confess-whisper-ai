import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

type IdentifierType = "user" | "ip";

export interface LoginRateLimitDecision {
  denied: boolean;
  unavailable: boolean;
  retryAfter?: number;
  remaining?: number;
  identifierType?: IdentifierType;
}

interface RateLimitPayload {
  allowed?: boolean;
  retryAfter?: number;
  remaining?: number;
  identifierType?: IdentifierType;
  error?: string;
}

type FetchWithTimeoutLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
) => Promise<Response>;

const parseRateLimitPayload = async (response: Response): Promise<RateLimitPayload | null> => {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== "object") return null;
    return payload as RateLimitPayload;
  } catch {
    return null;
  }
};

export const checkLoginRateLimitFailOpen = async ({
  supabaseUrl,
  internalJobSecret,
  authorizationHeader,
  action,
  ip,
  timeoutMs = 1200,
  fetchWithTimeoutImpl = fetchWithTimeout,
}: {
  supabaseUrl: string;
  internalJobSecret: string;
  authorizationHeader?: string | null;
  action: string;
  ip?: string | null;
  timeoutMs?: number;
  fetchWithTimeoutImpl?: FetchWithTimeoutLike;
}): Promise<LoginRateLimitDecision> => {
  const trimmedSupabaseUrl = supabaseUrl.trim();
  const trimmedSecret = internalJobSecret.trim();

  if (!trimmedSupabaseUrl || !trimmedSecret) {
    return { denied: false, unavailable: true };
  }

  const endpoint = `${trimmedSupabaseUrl.replace(/\/$/, "")}/functions/v1/rate-limit`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-secret": trimmedSecret,
  };
  const normalizedAuthorization = authorizationHeader?.trim();
  if (normalizedAuthorization) {
    headers.Authorization = normalizedAuthorization;
  }

  try {
    const response = await fetchWithTimeoutImpl(
      endpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          action,
          ip: ip ?? undefined,
        }),
      },
      timeoutMs,
    );

    const payload = await parseRateLimitPayload(response);
    const code = typeof payload?.error === "string" ? payload.error.toUpperCase() : "";

    if (response.status === 429 || payload?.allowed === false || code === "RATE_LIMIT") {
      return {
        denied: true,
        unavailable: false,
        retryAfter: typeof payload?.retryAfter === "number" ? payload.retryAfter : undefined,
        remaining: typeof payload?.remaining === "number" ? payload.remaining : 0,
        identifierType: payload?.identifierType,
      };
    }

    if (
      response.status === 404 ||
      response.status >= 500 ||
      code === "RATE_LIMIT_UNAVAILABLE" ||
      !response.ok
    ) {
      return { denied: false, unavailable: true };
    }

    return { denied: false, unavailable: false };
  } catch {
    return { denied: false, unavailable: true };
  }
};
