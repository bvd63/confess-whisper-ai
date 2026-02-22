import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("webhook reconciliation and timeout guards", () => {
  it("keeps fix-subscription-sync diagnostic-only without entitlement writes", () => {
    const source = read("supabase/functions/fix-subscription-sync/index.ts");

    expect(source).toContain("awaiting_webhook_reconciliation");
    expect(source).not.toContain("subscription_tier:");
    expect(source).not.toContain("subscription_status:");
    expect(source).not.toContain("is_premium:");
    expect(source).not.toContain(".update(updateData)");
  });

  it("keeps billing-cancel webhook-driven without profile writes", () => {
    const source = read("supabase/functions/billing-cancel/index.ts");

    expect(source).toContain("awaiting_webhook_reconciliation");
    expect(source).not.toContain(".update({");
    expect(source).not.toContain("subscription_status: \"canceled_pending\"");
  });

  it("enforces service-role internal access for check-trial-expiry and avoids entitlement writes", () => {
    const source = read("supabase/functions/check-trial-expiry/index.ts");

    expect(source).toContain("requireInternalSecret");
    expect(source).toContain("if (!premiumExpired && !legacyExpired)");
    expect(source).toContain("const updatePayload");
    expect(source).toContain("trial_active: false");
    expect(source).not.toContain("subscription_tier:");
    expect(source).not.toContain("is_premium:");
    expect(source).not.toContain("auth.getUser");
  });

  it("wraps targeted non-AI external fetch calls with 10s timeouts", () => {
    const enhancedAuth = read("supabase/functions/enhanced-auth/index.ts");
    const createConfession = read("supabase/functions/create-confession/index.ts");

    expect(enhancedAuth).toContain("fetchWithTimeout");
    expect((enhancedAuth.match(/fetchWithTimeout\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((enhancedAuth.match(/,\s*10_000\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(enhancedAuth).not.toContain("await fetch(");

    expect(createConfession).toContain("fetchWithTimeout");
    expect(createConfession).toContain("10_000");
    expect(createConfession).not.toContain("await fetch(");
  });

  it("wraps targeted AI external fetch calls with 20s timeouts", () => {
    const aiFiles = [
      "supabase/functions/deep-insight/index.ts",
      "supabase/functions/polish-confession/index.ts",
      "supabase/functions/ai-moderation/index.ts",
      "supabase/functions/analyze-tone/index.ts",
    ];

    for (const file of aiFiles) {
      const source = read(file);
      expect(source).toContain("fetchWithTimeout");
      expect(source).toContain("20_000");
      expect(source).not.toContain("await fetch(");
    }
  });
});
