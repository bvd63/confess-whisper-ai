import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createServerEnvSchema } from "./env-shared.ts";

declare const Deno: {
  env: {
    toObject(): Record<string, string | undefined>;
    get(key: string): string | undefined;
  };
};

export const ServerEnvSchema = createServerEnvSchema(z);

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export const getServerEnv = (): ServerEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = ServerEnvSchema.safeParse(Deno.env.toObject());
  if (!parsed.success) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Invalid server env",
        errors: parsed.error.flatten().fieldErrors,
      }),
    );
    throw new Error("Supabase function misconfigured: missing environment variables");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const buildCorsHeaders = (originHeader?: string | null) => {
  const env = getServerEnv();
  const allowedOrigins = env.EDGE_ALLOWED_ORIGINS;
  const origin = originHeader ?? "*";
  const allowOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] ?? "*";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-edge-token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };

  return headers;
};
