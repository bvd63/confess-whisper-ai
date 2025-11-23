import { buildCorsHeaders } from "./env.ts";

export const jsonResponse = (
  body: Record<string, unknown> | string,
  status = 200,
  origin?: string | null,
  headers?: Record<string, string>,
) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });

export const handleOptions = (origin?: string | null) =>
  new Response(null, { headers: buildCorsHeaders(origin) });
