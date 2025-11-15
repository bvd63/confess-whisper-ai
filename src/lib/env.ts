// src/lib/env.ts
import { z } from "zod";
import { logError, logWarn } from '@/lib/logger';

const booleanString = z.enum(["true", "false"]).optional();

const RawEnv = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_STRIPE_PRICE_VIP_MONTHLY: z.string().optional(),
  VITE_STRIPE_PRICE_VIP_YEARLY: z.string().optional(),
  VITE_ONESIGNAL_APP_ID: z.string().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_FEATURE_PASSWORDLESS: booleanString,
  VITE_FEATURE_OFFLINE_QUEUE: booleanString,
  VITE_FEATURE_BACKGROUND_QUEUE: booleanString,
  VITE_FEATURE_PWA_PROMPT: booleanString,
  VITE_FEATURE_PROFILE_MINI_ANALYTICS: booleanString,
  VITE_WEB_SHARE_ENABLED: booleanString,
  VITE_CONFESSION_TURNSTILE_REQUIRED: booleanString,
  MODE: z.enum(["development", "production", "test"]).default("development"),
});

const _raw = (typeof window !== "undefined" ? import.meta.env : ({} as any)) as Record<string, any>;

const parsed = RawEnv.safeParse({
  VITE_SUPABASE_URL: _raw.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: _raw.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_STRIPE_PRICE_VIP_MONTHLY: _raw.VITE_STRIPE_PRICE_VIP_MONTHLY,
  VITE_STRIPE_PRICE_VIP_YEARLY: _raw.VITE_STRIPE_PRICE_VIP_YEARLY,
  VITE_ONESIGNAL_APP_ID: _raw.VITE_ONESIGNAL_APP_ID,
  VITE_SENTRY_DSN: _raw.VITE_SENTRY_DSN,
  VITE_FEATURE_PASSWORDLESS: _raw.VITE_FEATURE_PASSWORDLESS,
  VITE_FEATURE_OFFLINE_QUEUE: _raw.VITE_FEATURE_OFFLINE_QUEUE,
  VITE_FEATURE_BACKGROUND_QUEUE: _raw.VITE_FEATURE_BACKGROUND_QUEUE,
  VITE_FEATURE_PWA_PROMPT: _raw.VITE_FEATURE_PWA_PROMPT,
  VITE_FEATURE_PROFILE_MINI_ANALYTICS: _raw.VITE_FEATURE_PROFILE_MINI_ANALYTICS,
  VITE_WEB_SHARE_ENABLED: _raw.VITE_WEB_SHARE_ENABLED,
  VITE_CONFESSION_TURNSTILE_REQUIRED: _raw.VITE_CONFESSION_TURNSTILE_REQUIRED,
  MODE: _raw.MODE,
});

if (!parsed.success) {
  logError("[ENV] Invalid client ENV", new Error(JSON.stringify(parsed.error.flatten().fieldErrors)));
  // Only throw if Supabase credentials are missing (required for app to function)
  const errors = parsed.error.flatten().fieldErrors;
  if (errors.VITE_SUPABASE_URL || errors.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Critical environment variables missing: Supabase credentials are required");
  }
  logWarn("[ENV] Some optional features may be unavailable (Stripe, OneSignal)");
}

export const env = {
  client: {
    supabaseUrl: parsed.data?.VITE_SUPABASE_URL || _raw.VITE_SUPABASE_URL,
    supabaseAnonKey: parsed.data?.VITE_SUPABASE_PUBLISHABLE_KEY || _raw.VITE_SUPABASE_PUBLISHABLE_KEY,
    stripePriceVipMonthly: parsed.data?.VITE_STRIPE_PRICE_VIP_MONTHLY || _raw.VITE_STRIPE_PRICE_VIP_MONTHLY,
    stripePriceVipYearly: parsed.data?.VITE_STRIPE_PRICE_VIP_YEARLY || _raw.VITE_STRIPE_PRICE_VIP_YEARLY,
    oneSignalAppId: parsed.data?.VITE_ONESIGNAL_APP_ID || _raw.VITE_ONESIGNAL_APP_ID,
    sentryDsn: parsed.data?.VITE_SENTRY_DSN || _raw.VITE_SENTRY_DSN,
  },
  features: {
    passwordless: (parsed.data?.VITE_FEATURE_PASSWORDLESS || _raw.VITE_FEATURE_PASSWORDLESS) === "true",
    offlineQueue: (parsed.data?.VITE_FEATURE_OFFLINE_QUEUE || _raw.VITE_FEATURE_OFFLINE_QUEUE) === "true",
    backgroundQueue: (parsed.data?.VITE_FEATURE_BACKGROUND_QUEUE || _raw.VITE_FEATURE_BACKGROUND_QUEUE) === "true",
    pwaPrompt: (parsed.data?.VITE_FEATURE_PWA_PROMPT || _raw.VITE_FEATURE_PWA_PROMPT) !== "false",
    profileMiniAnalytics: (parsed.data?.VITE_FEATURE_PROFILE_MINI_ANALYTICS || _raw.VITE_FEATURE_PROFILE_MINI_ANALYTICS) !== "false",
    webShareEnabled: (parsed.data?.VITE_WEB_SHARE_ENABLED || _raw.VITE_WEB_SHARE_ENABLED) !== "false",
    confessionTurnstileRequired: (parsed.data?.VITE_CONFESSION_TURNSTILE_REQUIRED || _raw.VITE_CONFESSION_TURNSTILE_REQUIRED) !== "false",
  },
  isProd: (parsed.data?.MODE || _raw.MODE) === "production",
  isDev: (parsed.data?.MODE || _raw.MODE) === "development",
} as const;
