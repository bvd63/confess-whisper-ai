// src/lib/env.ts
import { z } from "zod";

const RawEnv = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_STRIPE_PRICE_VIP_MONTH_ID: z.string().min(3),
  VITE_STRIPE_PRICE_VIP_YEAR_ID: z.string().min(3),
  VITE_ONESIGNAL_APP_ID: z.string().min(10),
  VITE_SENTRY_DSN: z.string().url().optional(),
  MODE: z.enum(["development", "production", "test"]).default("development"),
});

const _raw = (typeof window !== "undefined" ? import.meta.env : ({} as any)) as Record<string, any>;

const parsed = RawEnv.safeParse({
  VITE_SUPABASE_URL: _raw.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: _raw.VITE_SUPABASE_ANON_KEY,
  VITE_STRIPE_PRICE_VIP_MONTH_ID: _raw.VITE_STRIPE_PRICE_VIP_MONTH_ID,
  VITE_STRIPE_PRICE_VIP_YEAR_ID: _raw.VITE_STRIPE_PRICE_VIP_YEAR_ID,
  VITE_ONESIGNAL_APP_ID: _raw.VITE_ONESIGNAL_APP_ID,
  VITE_SENTRY_DSN: _raw.VITE_SENTRY_DSN,
  MODE: _raw.MODE,
});

if (!parsed.success) {
  console.error("[ENV] Invalid client ENV:", parsed.error.flatten().fieldErrors);
  throw new Error("Client ENV validation failed.");
}

export const env = {
  client: {
    supabaseUrl: parsed.data.VITE_SUPABASE_URL,
    supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
    stripePriceVipMonthId: parsed.data.VITE_STRIPE_PRICE_VIP_MONTH_ID,
    stripePriceVipYearId: parsed.data.VITE_STRIPE_PRICE_VIP_YEAR_ID,
    oneSignalAppId: parsed.data.VITE_ONESIGNAL_APP_ID,
    sentryDsn: parsed.data.VITE_SENTRY_DSN,
  },
  isProd: parsed.data.MODE === "production",
  isDev: parsed.data.MODE === "development",
} as const;
