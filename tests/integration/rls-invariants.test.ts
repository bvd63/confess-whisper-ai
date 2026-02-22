import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readMigration = (filename: string) =>
  readFileSync(join(process.cwd(), "supabase", "migrations", filename), "utf-8");

describe("RLS and migration security invariants", () => {
  it("keeps owner-based RLS policies for sensitive user data", () => {
    const baseline = readMigration("20251220131000_rls_baseline_confessions_and_user_data.sql");
    const profilesLockdown = readMigration("20251220120000_lockdown_public_profiles_and_subscriptions.sql");

    expect(baseline).toContain('create policy "user_coins_select_owner"');
    expect(baseline).toContain('create policy "coin_transactions_select_owner"');
    expect(profilesLockdown).toContain('create policy "subscriptions_select_self"');
    expect(profilesLockdown).toContain("using (auth.uid() = user_id)");
    expect(profilesLockdown).toContain("force row level security");
  });

  it("does not contain hardcoded project URLs or bearer tokens in SQL migrations", () => {
    const allMigrationContent = [
      "20251017120439_7ccf2d27-4c5f-4142-9aee-2c41762b7262.sql",
      "20251018183659_51ff080f-15ee-4afc-9dff-ff0f51a81eeb.sql",
      "20251020010622_4c6c9aee-5725-4f02-b37d-c15703c8692a.sql",
      "20251020142826_9fbad11a-4b90-46ac-9c4d-5b9deacb4659.sql",
      "20251109135309_2820f926-c02a-4c5a-a89f-0c961c6a8b45.sql",
    ]
      .map(readMigration)
      .join("\n");

    expect(allMigrationContent).not.toMatch(/supabase\.co\/functions\/v1/);
    expect(allMigrationContent).not.toMatch(/Authorization"\s*:\s*"Bearer/i);
    expect(allMigrationContent).not.toMatch(/eyJ[a-zA-Z0-9_\-\.]{20,}/);
  });

  it("blocks streak write tampering and removes badge-driven auto-approval", () => {
    const sql = readMigration("20260218136000_streak_moderation_bypass_guard.sql");

    // Authenticated users must not be able to mutate streak rows directly.
    expect(sql).toContain('drop policy if exists "Users can update their streak" on public.user_streaks;');
    expect(sql).toContain('drop policy if exists "Users can insert their streak" on public.user_streaks;');
    expect(sql).toContain('create policy "user_streaks_service_role_write"');
    expect(sql).toContain("to service_role");

    // Badge ownership must not auto-approve confession moderation.
    expect(sql).toContain("create or replace function public.auto_moderate_confession()");
    expect(sql).not.toContain("from user_badges");
  });
});
