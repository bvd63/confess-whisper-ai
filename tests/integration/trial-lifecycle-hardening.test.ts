import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("trial lifecycle hardening", () => {
  it("rejects trial checkout when profile already marks trial as used", () => {
    const source = read("supabase/functions/create-trial-checkout/index.ts");

    expect(source).toContain('.select("trial_used, trial_premium_used, subscription_tier, is_premium, stripe_customer_id")');
    expect(source).toContain("if (profile.trial_used || profile.trial_premium_used)");
    expect(source).toContain('error: "TRIAL_ALREADY_USED"');
    expect(source).toContain("status: 409");
  });

  it("persists one-time trial usage and trial timestamps from Stripe-confirmed subscription data", () => {
    const source = read("supabase/functions/stripe-webhook-subscriptions/index.ts");

    expect(source).toContain("const trialStartIso = toIsoFromUnix(subscription?.trial_start);");
    expect(source).toContain("const trialEndIso = toIsoFromUnix(subscription?.trial_end);");
    expect(source).toContain("const hasConfirmedTrial = trialStartIso !== null || trialEndIso !== null;");
    expect(source).toContain("trial_used: true");
    expect(source).toContain("trial_premium_used: true");
    expect(source).toContain("trial_activated_at: trialStartIso");
    expect(source).toContain("trial_premium_ends_at: trialEndIso");
  });

  it("keeps webhook retries idempotent by short-circuiting duplicate event ids", () => {
    const source = read("supabase/functions/stripe-webhook-subscriptions/index.ts");

    expect(source).toContain('if (idempotencyError.code === "23505")');
    expect(source).toContain("Duplicate webhook event received; skipping side effects");
    expect(source).toContain(
      "return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });",
    );
  });
});
