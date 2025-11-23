// src/lib/env.ts
import { z } from "zod";
import {
  createClientEnvSchema,
  parseBooleanFlag,
  parseFeatureFlag,
} from "../../supabase/functions/_shared/env-shared.ts";

const logEnvWarning = (message: string, payload?: unknown) => {
  if (typeof console !== "undefined") {
    console.warn(message, payload ?? "");
  }
};

const logEnvError = (message: string, payload?: unknown) => {
  if (typeof console !== "undefined") {
    console.error(message, payload ?? "");
  }
};

const RawEnv = createClientEnvSchema(z);

const runtimeEnv = (
  typeof window !== "undefined"
    ? import.meta.env
    : (process.env as Record<string, string | undefined>)
) as Record<string, string | undefined>;

const parsed = RawEnv.safeParse({
  VITE_SUPABASE_URL: runtimeEnv.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY,
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
  MODE: runtimeEnv.MODE ?? process.env.NODE_ENV ?? "development",
});

if (!parsed.success) {
  logEnvError(
    "[ENV] Invalid client ENV",
    parsed.error.flatten().fieldErrors,
  );
  // Only throw if Supabase credentials are missing (required for app to function)
  const errors = parsed.error.flatten().fieldErrors;
  if (errors.VITE_SUPABASE_URL || errors.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Critical environment variables missing: Supabase credentials are required");
  }
  logEnvWarning("[ENV] Some optional features may be unavailable (Stripe, OneSignal)");
}

const resolvedEnv = parsed.success ? parsed.data : undefined;

const read = (key: keyof typeof runtimeEnv, fallback?: string) =>
  (resolvedEnv && (resolvedEnv as Record<string, string | undefined>)[key]) ??
  runtimeEnv[key] ??
  fallback;

const mode = read("MODE", process.env.NODE_ENV ?? "development");

export const env = {
  client: {
    supabaseUrl: read("VITE_SUPABASE_URL"),
    supabaseAnonKey: read("VITE_SUPABASE_PUBLISHABLE_KEY"),
    stripePriceVipMonthly: read("VITE_STRIPE_PRICE_VIP_MONTHLY"),
    stripePriceVipYearly: read("VITE_STRIPE_PRICE_VIP_YEARLY"),
    oneSignalAppId: read("VITE_ONESIGNAL_APP_ID"),
    sentryDsn: read("VITE_SENTRY_DSN"),
  },
  features: {
    passwordless: parseBooleanFlag(read("VITE_FEATURE_PASSWORDLESS")),
    offlineQueue: parseBooleanFlag(read("VITE_FEATURE_OFFLINE_QUEUE")),
    backgroundQueue: parseBooleanFlag(read("VITE_FEATURE_BACKGROUND_QUEUE")),
    pwaPrompt: parseFeatureFlag(read("VITE_FEATURE_PWA_PROMPT"), { defaultValue: true }),
    profileMiniAnalytics: parseFeatureFlag(
      read("VITE_FEATURE_PROFILE_MINI_ANALYTICS"),
      { defaultValue: true },
    ),
    webShareEnabled: parseFeatureFlag(read("VITE_WEB_SHARE_ENABLED"), { defaultValue: true }),
    confessionTurnstileRequired: parseBooleanFlag(
      read("VITE_CONFESSION_TURNSTILE_REQUIRED"),
      false,
    ),
  },
  isProd: mode === "production",
  isDev: mode === "development",
} as const;
