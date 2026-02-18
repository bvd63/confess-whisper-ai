import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("backend hardening regression checks", () => {
  it("locks award_coins execute privileges to service role", () => {
    const sql = read("supabase/migrations/20260218130000_rpc_security_hardening.sql");
    expect(sql).toContain("revoke all on function public.award_coins(uuid, integer, text, text) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.award_coins(uuid, integer, text, text) to service_role;");
  });

  it("guards deduct_coins against negative amounts and cross-user debits", () => {
    const sql = read("supabase/migrations/20260218130000_rpc_security_hardening.sql");
    expect(sql).toContain("if _amount is null or _amount <= 0 then");
    expect(sql).toContain("if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then");
  });

  it("protects session revocation RPC with ownership checks", () => {
    const sql = read("supabase/migrations/20260218130000_rpc_security_hardening.sql");
    expect(sql).toContain("create or replace function public.revoke_all_user_sessions(_user_id uuid)");
    expect(sql).toContain("if auth.role() <> 'service_role' and auth.uid() is distinct from _user_id then");
  });

  it("prevents direct client inserts into confessions table", () => {
    const sql = read("supabase/migrations/20260218130500_confessions_insert_moderation_guard.sql");
    expect(sql).toContain("with check (false);");
  });

  it("blocks authenticated users from mutating sensitive profile entitlement fields", () => {
    const sql = read("supabase/migrations/20260218131000_profiles_sensitive_update_guard.sql");
    expect(sql).toContain("create or replace function public.guard_profiles_sensitive_columns()");
    expect(sql).toContain("raise exception 'FORBIDDEN_SENSITIVE_PROFILE_UPDATE';");
    expect(sql).toContain("create trigger guard_profiles_sensitive_columns_trigger");
  });

  it("avoids granting trial entitlements before checkout completion", () => {
    const source = read("supabase/functions/create-trial-checkout/index.ts");
    expect(source).not.toContain("subscription_tier: \"vip\"");
    expect(source).not.toContain("trial_active: true");
    expect(source).toContain("trialStartsAfterCheckout: true");
  });

  it("requires VIP price IDs before granting VIP in webhook sync", () => {
    const source = read("supabase/functions/stripe-webhook-subscriptions/index.ts");
    expect(source).toContain("if (!priceId || !isVipPriceSafely(priceId)) return false;");
  });
});
