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

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const parseRateLimitPayload = async (
  response: Response,
): Promise<{ payload: RateLimitPayload | null; validJson: boolean }> => {
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      return { payload: null, validJson: false };
    }
    return { payload: payload as RateLimitPayload, validJson: true };
  } catch {
    return { payload: null, validJson: false };
  }
};

const parseRetryAfter = (response: Response, payload: RateLimitPayload | null): number | undefined => {
  if (typeof payload?.retryAfter === "number" && Number.isFinite(payload.retryAfter)) {
    return payload.retryAfter;
  }

  const retryAfterHeader = response.headers.get("Retry-After");
  if (!retryAfterHeader) {
    return undefined;
  }

  const parsed = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
};

const fetchWithAbortTimeout = async ({
  fetchImpl,
  input,
  init,
  timeoutMs,
}: {
  fetchImpl: FetchLike;
  input: RequestInfo | URL;
  init?: RequestInit;
  timeoutMs: number;
}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const checkLoginRateLimitFailOpen = async ({
  supabaseUrl,
  internalJobSecret,
  authorizationHeader,
  action,
  ip,
  loginIdentifierHash,
  timeoutMs = 1200,
  fetchImpl = fetch,
}: {
  supabaseUrl: string;
  internalJobSecret: string;
  authorizationHeader?: string | null;
  action: string;
  ip?: string | null;
  loginIdentifierHash?: string | null;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<LoginRateLimitDecision> => {
  try {
    const trimmedSupabaseUrl = typeof supabaseUrl === "string" ? supabaseUrl.trim() : "";
    const trimmedSecret = typeof internalJobSecret === "string" ? internalJobSecret.trim() : "";
    const normalizedLoginIdentifierHash = typeof loginIdentifierHash === "string"
      ? loginIdentifierHash.trim().toLowerCase()
      : "";
    const hasValidLoginIdentifierHash = /^[a-f0-9]{64}$/.test(normalizedLoginIdentifierHash);

    if (!trimmedSupabaseUrl || !trimmedSecret) {
      return { denied: true, unavailable: true };
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

    let response: Response;
    try {
      response = await fetchWithAbortTimeout({
        fetchImpl,
        input: endpoint,
        init: {
          method: "POST",
          headers,
          body: JSON.stringify({
            action,
            ip: ip ?? undefined,
            loginIdentifierHash: hasValidLoginIdentifierHash
              ? normalizedLoginIdentifierHash
              : undefined,
          }),
        },
        timeoutMs,
      });
    } catch {
      return { denied: true, unavailable: true };
    }

    const { payload, validJson } = await parseRateLimitPayload(response);
    const code = typeof payload?.error === "string" ? payload.error.toUpperCase() : "";

    if (response.status === 429) {
      return {
        denied: true,
        unavailable: false,
        retryAfter: parseRetryAfter(response, payload),
        remaining: typeof payload?.remaining === "number" ? payload.remaining : 0,
        identifierType: payload?.identifierType,
      };
    }

    if (!response.ok) {
      return {
        denied: true,
        unavailable: true,
        retryAfter: parseRetryAfter(response, payload),
        remaining: typeof payload?.remaining === "number" ? payload.remaining : 0,
        identifierType: payload?.identifierType,
      };
    }

    if (!validJson || !payload) {
      return { denied: true, unavailable: true };
    }

    if (payload.allowed === false || code === "RATE_LIMIT") {
      return {
        denied: true,
        unavailable: false,
        retryAfter: parseRetryAfter(response, payload),
        remaining: typeof payload.remaining === "number" ? payload.remaining : 0,
        identifierType: payload.identifierType,
      };
    }

    if (code === "RATE_LIMIT_UNAVAILABLE") {
      return { denied: true, unavailable: true };
    }

    return { denied: false, unavailable: false };
  } catch {
    return { denied: true, unavailable: true };
  }
};
