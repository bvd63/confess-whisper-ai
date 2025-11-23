import { getServerEnv } from "./env.ts";
import { jsonResponse } from "./http.ts";

export const EDGE_TOKEN_HEADER = "x-edge-token";

export interface RequestContext {
  origin: string | null;
  userAgent: string;
  ipAddress: string;
}

export const getRequestContext = (req: Request): RequestContext => {
  const origin = req.headers.get("origin");
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip");
  const ipAddress = forwardedFor || realIp || "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { origin, userAgent, ipAddress };
};

export const isEdgeAuthorized = (req: Request, env = getServerEnv()): boolean => {
  const provided = req.headers.get(EDGE_TOKEN_HEADER);
  return Boolean(provided && provided === env.EDGE_INTERNAL_TOKEN);
};

export const ensureEdgeAuthorized = (req: Request, origin?: string | null) => {
  if (!isEdgeAuthorized(req)) {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401, origin);
  }
  return null;
};
