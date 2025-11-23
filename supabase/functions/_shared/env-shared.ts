const BOOLEAN_VALUES = ["true", "false"] as const;

export type BooleanLiteral = typeof BOOLEAN_VALUES[number];

const createBooleanEnum = (z: any) => z.enum(BOOLEAN_VALUES);
const createOptionalBooleanEnum = (z: any) => createBooleanEnum(z).optional();

export const createClientEnvSchema = (z: any) =>
  z.object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    VITE_STRIPE_PRICE_VIP_MONTHLY: z.string().optional(),
    VITE_STRIPE_PRICE_VIP_YEARLY: z.string().optional(),
    VITE_ONESIGNAL_APP_ID: z.string().optional(),
    VITE_SENTRY_DSN: z.string().url().optional(),
    VITE_FEATURE_PASSWORDLESS: createOptionalBooleanEnum(z),
    VITE_FEATURE_OFFLINE_QUEUE: createOptionalBooleanEnum(z),
    VITE_FEATURE_BACKGROUND_QUEUE: createOptionalBooleanEnum(z),
    VITE_FEATURE_PWA_PROMPT: createOptionalBooleanEnum(z),
    VITE_FEATURE_PROFILE_MINI_ANALYTICS: createOptionalBooleanEnum(z),
    VITE_WEB_SHARE_ENABLED: createOptionalBooleanEnum(z),
    VITE_CONFESSION_TURNSTILE_REQUIRED: createOptionalBooleanEnum(z),
    MODE: z.enum(["development", "production", "test"]).default("development"),
  });

export const createServerEnvSchema = (z: any) =>
  z.object({
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
        value?.split(",").map((origin: string) => origin.trim()).filter(Boolean) ?? []),
    CONFESSION_TURNSTILE_REQUIRED: z
      .string()
      .optional()
      .transform((value: string | undefined) => (value ? parseBooleanFlag(value) : true)),
  });

export const parseBooleanFlag = (value?: string | BooleanLiteral | null, defaultValue = false) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return String(value) === "true";
};

export const parseFeatureFlag = (
  value?: string | BooleanLiteral | null,
  { defaultValue = true }: { defaultValue?: boolean } = {},
) => parseBooleanFlag(value, defaultValue);
