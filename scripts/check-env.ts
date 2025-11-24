// scripts/check-env.ts
// Environment validation script for CI/CD pipeline
// Validates all required environment variables using Zod schemas

import { env, ServerEnvSchema } from "../src/config/env";

console.log("🔍 Validating environment configuration...\n");

let hasFatalError = false;

// Check critical Supabase credentials
if (env.client.supabaseUrl && env.client.supabaseAnonKey) {
  console.log("✅ Supabase credentials: Valid");
  console.log(`   - URL: ${env.client.supabaseUrl.substring(0, 30)}...`);
  console.log(`   - Anon Key: ${env.client.supabaseAnonKey.substring(0, 20)}...`);
} else {
  console.error("❌ Supabase credentials: Missing or invalid");
  process.exit(1);
}

// Check optional Stripe configuration
if (env.client.stripePriceVipMonthly || env.client.stripePriceVipYearly) {
  console.log("✅ Stripe Price IDs: Configured");
  if (env.client.stripePriceVipMonthly) {
    console.log(`   - Monthly: ${env.client.stripePriceVipMonthly}`);
  }
  if (env.client.stripePriceVipYearly) {
    console.log(`   - Yearly: ${env.client.stripePriceVipYearly}`);
  }
} else {
  console.log("⚠️  Stripe Price IDs: Not configured (optional)");
}

// Check optional OneSignal configuration
if (env.client.oneSignalAppId) {
  console.log("✅ OneSignal App ID: Configured");
  console.log(`   - App ID: ${env.client.oneSignalAppId.substring(0, 20)}...`);
} else {
  console.log("⚠️  OneSignal App ID: Not configured (optional)");
}

// Check optional Sentry configuration
if (env.client.sentryDsn) {
  console.log("✅ Sentry DSN: Configured");
  console.log(`   - DSN: ${env.client.sentryDsn.substring(0, 30)}...`);
} else {
  console.log("⚠️  Sentry DSN: Not configured (optional)");
}

// Feature flag overview
console.log("\n🧩 Feature Flags:");
console.log(`   - Passwordless Auth: ${env.features.passwordless ? 'ENABLED' : 'disabled'}`);
console.log(`   - Offline Queue: ${env.features.offlineQueue ? 'ENABLED' : 'disabled'}`);
console.log(`   - Background Queue: ${env.features.backgroundQueue ? 'ENABLED' : 'disabled'}`);
console.log(`   - PWA Prompt: ${env.features.pwaPrompt ? 'ENABLED' : 'disabled'}`);
console.log(`   - Profile Mini Analytics: ${env.features.profileMiniAnalytics ? 'ENABLED' : 'disabled'}`);
console.log(`   - Web Share API: ${env.features.webShareEnabled ? 'ENABLED' : 'disabled'}`);
console.log(`   - Turnstile Enforcement: ${env.features.confessionTurnstileRequired ? 'ENABLED' : 'disabled'}`);

const serverEnvResult = ServerEnvSchema.safeParse(process.env);

if (!serverEnvResult.success) {
  hasFatalError = true;
  console.error("\n❌ Server environment: Invalid or missing variables");
  const issues = serverEnvResult.error.flatten().fieldErrors;
  for (const [key, messages] of Object.entries(issues)) {
    console.error(`   - ${key}: ${messages?.join(", ") ?? "invalid"}`);
  }
} else {
  const serverEnv = serverEnvResult.data;
  console.log("\n✅ Server environment: All required secrets present");
  console.log(`   - Supabase URL: ${serverEnv.SUPABASE_URL}`);
  console.log(`   - Stripe Prices: monthly=${serverEnv.STRIPE_PRICE_VIP_MONTHLY}, yearly=${serverEnv.STRIPE_PRICE_VIP_YEARLY}`);
  console.log(`   - Edge allowed origins: ${serverEnv.EDGE_ALLOWED_ORIGINS.length > 0 ? serverEnv.EDGE_ALLOWED_ORIGINS.join(", ") : "(none - falling back to * in dev)"}`);

  if (env.features.confessionTurnstileRequired && !serverEnv.TURNSTILE_SECRET) {
    hasFatalError = true;
    console.error("⚠️  Turnstile Secret: Missing while confession CAPTCHA enforcement is enabled");
  }
}

// Check environment mode
console.log(`\n📊 Environment Mode: ${env.isProd ? "PRODUCTION" : "DEVELOPMENT"}`);

if (hasFatalError) {
  console.error("\n❌ Environment validation failed. Fix the errors above before continuing.\n");
  process.exit(1);
}

console.log("\n✅ Environment validation completed successfully!");
console.log("🎉 All critical configuration is valid\n");

process.exit(0);
