/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_ONESIGNAL_APP_ID: string;
  readonly VITE_STRIPE_PRICE_VIP_MONTHLY: string;
  readonly VITE_STRIPE_PRICE_VIP_YEARLY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
