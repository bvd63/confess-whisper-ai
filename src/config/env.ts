import { z } from "zod";
import {
  createClientEnvSchema,
  createServerEnvSchema,
  parseBooleanFlag,
  parseFeatureFlag,
} from "../../supabase/functions/_shared/env-shared.ts";

const ClientEnvSchema = createClientEnvSchema(z);
const ServerEnvSchema = createServerEnvSchema(z);

type RuntimeEnv = Record<string, string | undefined>;
type ClientEnvShape = z.infer<typeof ClientEnvSchema>;

const logEnvIssue = (level: "warn" | "error", message: string, payload?: unknown) => {
  if (typeof console === "undefined") {
    return;
  }
  const entry = {
    level,
    message,
    ...(payload ? { payload } : {}),
  };
  if (level === "error") {
    console.error(entry);
  } else {
    console.warn(entry);
  }
};

const runtimeEnv: RuntimeEnv = typeof window !== "undefined"
  ? (import.meta.env as unknown as RuntimeEnv)
  : (process.env as RuntimeEnv);

const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;

const parsedClientEnv = ClientEnvSchema.safeParse({
  VITE_SUPABASE_URL: runtimeEnv.VITE_SUPABASE_URL,
  VITE_SUPABASE_PROJECT_ID: runtimeEnv.VITE_SUPABASE_PROJECT_ID,
  VITE_SUPABASE_PUBLISHABLE_KEY: runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_TURNSTILE_SITE_KEY: runtimeEnv.VITE_TURNSTILE_SITE_KEY,
  VITE_STRIPE_PRICE_VIP_MONTHLY: runtimeEnv.VITE_STRIPE_PRICE_VIP_MONTHLY,
  VITE_STRIPE_PRICE_VIP_YEARLY: runtimeEnv.VITE_STRIPE_PRICE_VIP_YEARLY,
  VITE_ONESIGNAL_APP_ID: runtimeEnv.VITE_ONESIGNAL_APP_ID,
  VITE_SENTRY_DSN: runtimeEnv.VITE_SENTRY_DSN,
  VITE_FEATURE_PASSWORDLESS: runtimeEnv.VITE_FEATURE_PASSWORDLESS,
  VITE_FEATURE_OFFLINE_QUEUE: runtimeEnv.VITE_FEATURE_OFFLINE_QUEUE,
  VITE_FEATURE_BACKGROUND_QUEUE: runtimeEnv.VITE_FEATURE_BACKGROUND_QUEUE,
  VITE_FEATURE_PWA_PROMPT: runtimeEnv.VITE_FEATURE_PWA_PROMPT,
  VITE_FEATURE_PROFILE_MINI_ANALYTICS: runtimeEnv.VITE_FEATURE_PROFILE_MINI_ANALYTICS,
  VITE_WEB_SHARE_ENABLED: runtimeEnv.VITE_WEB_SHARE_ENABLED,
  VITE_CONFESSION_TURNSTILE_REQUIRED: runtimeEnv.VITE_CONFESSION_TURNSTILE_REQUIRED,
  MODE: runtimeEnv.MODE ?? nodeEnv ?? "development",
});

if (!parsedClientEnv.success) {
  const fieldErrors = parsedClientEnv.error.flatten().fieldErrors;
  const missing = Object.keys(fieldErrors);
  logEnvIssue("error", "[ENV] Invalid client environment configuration", { missing });
  throw new Error("Client environment misconfigured: missing critical variables");
}

const resolvedClientEnv: ClientEnvShape = parsedClientEnv.data;

const defaultMode = ((nodeEnv ?? "development") as ClientEnvShape["MODE"]);
const mode = resolvedClientEnv.MODE ?? defaultMode;

export const env = {
  client: {
    supabaseUrl: resolvedClientEnv.VITE_SUPABASE_URL,
    supabaseAnonKey: resolvedClientEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
    supabaseProjectId: resolvedClientEnv.VITE_SUPABASE_PROJECT_ID,
    turnstileSiteKey: resolvedClientEnv.VITE_TURNSTILE_SITE_KEY,
    stripePriceVipMonthly: resolvedClientEnv.VITE_STRIPE_PRICE_VIP_MONTHLY,
    stripePriceVipYearly: resolvedClientEnv.VITE_STRIPE_PRICE_VIP_YEARLY,
    oneSignalAppId: resolvedClientEnv.VITE_ONESIGNAL_APP_ID,
    sentryDsn: resolvedClientEnv.VITE_SENTRY_DSN,
  },
  features: {
    passwordless: parseBooleanFlag(resolvedClientEnv.VITE_FEATURE_PASSWORDLESS),
    offlineQueue: parseBooleanFlag(resolvedClientEnv.VITE_FEATURE_OFFLINE_QUEUE),
    backgroundQueue: parseBooleanFlag(resolvedClientEnv.VITE_FEATURE_BACKGROUND_QUEUE),
    pwaPrompt: parseFeatureFlag(resolvedClientEnv.VITE_FEATURE_PWA_PROMPT, { defaultValue: true }),
    profileMiniAnalytics: parseFeatureFlag(resolvedClientEnv.VITE_FEATURE_PROFILE_MINI_ANALYTICS, {
      defaultValue: true,
    }),
    webShareEnabled: parseFeatureFlag(resolvedClientEnv.VITE_WEB_SHARE_ENABLED, { defaultValue: true }),
    confessionTurnstileRequired: parseBooleanFlag(
      resolvedClientEnv.VITE_CONFESSION_TURNSTILE_REQUIRED,
      false,
    ),
  },
  isProd: mode === "production",
  isDev: mode === "development",
} as const;

export type ClientEnv = typeof env;

const ensureProcessEnv = (): RuntimeEnv => {
  if (typeof process === "undefined" || !process.env) {
    throw new Error("Server environment unavailable: process.env not accessible");
  }
  return process.env as RuntimeEnv;
};

let cachedServerEnv: z.infer<typeof ServerEnvSchema> | null = null;

export const getServerEnv = () => {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }
  const parsed = ServerEnvSchema.safeParse(ensureProcessEnv());
  if (!parsed.success) {
    const missing = Object.keys(parsed.error.flatten().fieldErrors);
    logEnvIssue("error", "[ENV] Invalid server environment configuration", { missing });
    throw new Error("Server environment misconfigured: missing critical variables");
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
};

export { ClientEnvSchema, ServerEnvSchema };
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
