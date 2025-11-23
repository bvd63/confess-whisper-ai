import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

export const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  // Keep CI secrets in sync with client validators to avoid check-env drift
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_VIP_MONTHLY: z.string().min(5),
  STRIPE_PRICE_VIP_YEARLY: z.string().min(5),
  ONESIGNAL_REST_API_KEY: z.string().min(10),
  VITE_ONESIGNAL_APP_ID: z.string().min(10),
  TURNSTILE_SECRET: z.string().min(10).optional(),
  LOVABLE_API_KEY: z.string().min(10),
  EDGE_INTERNAL_TOKEN: z.string().min(32),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().optional(),
  EDGE_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []
    ),
  CONFESSION_TURNSTILE_REQUIRED: z
    .string()
    .optional()
    .transform((value) => (value ? booleanString.parse(value) : true)),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export const parseServerEnv = (): ServerEnv => {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const missing = Object.keys(flattened);
    throw new Error(
      `Invalid server environment configuration: ${missing.join(", ")}`,
    );
  }

  return parsed.data;
};

export const serverEnv = parseServerEnv();
