import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

declare const Deno: {
  env: {
    toObject(): Record<string, string | undefined>;
    get(key: string): string | undefined;
  };
};

const booleanString = z
  .enum(["true", "false"])
  .transform((value: "true" | "false") => value === "true");

export const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().min(10),
  STRIPE_WEBHOOK_SECRET: z.string().min(10).optional(),
  STRIPE_PRICE_VIP_MONTHLY: z.string().min(5),
  STRIPE_PRICE_VIP_YEARLY: z.string().min(5),
  ONESIGNAL_REST_API_KEY: z.string().min(10),
  VITE_ONESIGNAL_APP_ID: z.string().min(5),
  TURNSTILE_SECRET: z.string().min(10).optional(),
  LOVABLE_API_KEY: z.string().min(10).optional(),
  EDGE_INTERNAL_TOKEN: z.string().min(32),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),
  EDGE_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value: string | undefined) =>
      value?.split(",").map((origin: string) => origin.trim()).filter(Boolean) ?? []
    ),
  CONFESSION_TURNSTILE_REQUIRED: z
    .string()
    .optional()
    .transform((value: string | undefined) => (value ? booleanString.parse(value) : true)),
});

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
