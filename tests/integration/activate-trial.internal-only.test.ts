import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const functionSourcePath = "supabase/functions/activate-trial/index.ts";
const migrationPath =
  "supabase/migrations/20260218139000_harden_activate_trial_internal_only_three_day.sql";

describe("activate-trial hardening", () => {
  it("requires authenticated context and internal secret", () => {
    const source = read(functionSourcePath);

    expect(source).toContain("getAuthenticatedRequestContext");
    expect(source).toContain("requireInternalSecret");
    expect(source).toContain("if (!auth.ok) return auth.response;");
    expect(source).toContain("if (!internal.ok) return internal.response;");
  });

  it("rejects cross-user activation attempts from request body", () => {
    const source = read(functionSourcePath);

    expect(source).toContain("FORBIDDEN_USER_MISMATCH");
    expect(source).toContain("requestedUserId");
    expect(source).toContain("requestedUserId !== authUserId");
  });

  it("maps one-time trial reuse to 409 TRIAL_ALREADY_USED", () => {
    const source = read(functionSourcePath);

    expect(source).toContain('error: "TRIAL_ALREADY_USED"');
    expect(source).toContain("}, 409)");
  });

  it("sets exact 3-day trial window and only trial flags in activate_trial RPC", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("v_now timestamptz := now();");
    expect(sql).toContain("v_trial_end timestamptz := v_now + interval '3 days';");
    expect(sql).toContain("trial_active = true");
    expect(sql).toContain("trial_activated_at = v_now");
    expect(sql).toContain("trial_end_date = v_trial_end");
    expect(sql).toContain("trial_premium_ends_at = v_trial_end");
    expect(sql).toContain("trial_used = true");
    expect(sql).not.toContain("subscription_tier =");
    expect(sql).not.toContain("is_premium =");
  });

  it("keeps activate_trial RPC execution restricted to service_role", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("revoke all on function public.activate_trial(uuid) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.activate_trial(uuid) to service_role;");
  });
});
