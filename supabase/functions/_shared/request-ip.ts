const IPV4_SEGMENT = "(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])";
const IPV4_REGEX = new RegExp(`^${IPV4_SEGMENT}(\\.${IPV4_SEGMENT}){3}$`);

const stripPortAndBrackets = (value: string): string => {
  const trimmed = value.trim().replace(/^"+|"+$/g, "");
  if (!trimmed) return "";

  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(1, trimmed.indexOf("]")).trim();
  }

  if (trimmed.includes(":") && trimmed.includes(".")) {
    const [candidate, maybePort] = trimmed.split(":");
    if (candidate && maybePort && /^[0-9]+$/.test(maybePort)) {
      return candidate.trim();
    }
  }

  return trimmed;
};

const isLikelyIpv6 = (value: string): boolean => {
  if (!value.includes(":")) return false;
  const withoutZone = value.replace(/%.+$/, "");
  return /^[A-Fa-f0-9:.]+$/.test(withoutZone);
};

export const sanitizeIpCandidate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = stripPortAndBrackets(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === "unknown" || lower === "null" || lower === "undefined") {
    return null;
  }

  if (IPV4_REGEX.test(normalized)) return normalized;
  if (isLikelyIpv6(normalized)) return normalized;

  return null;
};

export const parseForwardedForFirstIp = (headerValue: string | null | undefined): string | null => {
  if (!headerValue) return null;
  const first = headerValue.split(",")[0]?.trim();
  return sanitizeIpCandidate(first);
};

const isTrustProxyEnabled = (): boolean => {
  const value = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } })
    .Deno?.env?.get?.("TRUST_PROXY");
  return typeof value === "string" && value.toLowerCase() === "true";
};

export const getClientIp = (
  req: Request,
  options: { trustProxy?: boolean } = {},
): string => {
  const platformIpHeaders = [
    "cf-connecting-ip",
    "fly-client-ip",
    "x-envoy-external-address",
  ];

  for (const header of platformIpHeaders) {
    const candidate = sanitizeIpCandidate(req.headers.get(header));
    if (candidate) return candidate;
  }

  const trustProxy = options.trustProxy ?? isTrustProxyEnabled();
  if (trustProxy) {
    const forwarded = parseForwardedForFirstIp(req.headers.get("x-forwarded-for"));
    if (forwarded) return forwarded;

    const realIp = sanitizeIpCandidate(req.headers.get("x-real-ip"));
    if (realIp) return realIp;
  }

  return "unknown";
};
