// scripts/check-env.ts
// Environment validation script for CI/CD pipeline
// Validates all required environment variables using Zod schemas

import { env } from "../src/lib/env";

console.log("🔍 Validating environment configuration...\n");

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
if (env.client.stripePriceVipMonthId || env.client.stripePriceVipYearId) {
  console.log("✅ Stripe Price IDs: Configured");
  if (env.client.stripePriceVipMonthId) {
    console.log(`   - Monthly: ${env.client.stripePriceVipMonthId}`);
  }
  if (env.client.stripePriceVipYearId) {
    console.log(`   - Yearly: ${env.client.stripePriceVipYearId}`);
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

// Check environment mode
console.log(`\n📊 Environment Mode: ${env.isProd ? "PRODUCTION" : "DEVELOPMENT"}`);

console.log("\n✅ Environment validation completed successfully!");
console.log("🎉 All critical configuration is valid\n");

process.exit(0);
