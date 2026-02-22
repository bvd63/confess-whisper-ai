import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const migrationPath =
  "supabase/migrations/20260218138000_lockdown_subscriptions_writes_and_remove_sync_trigger.sql";

describe("subscriptions write-lockdown regression", () => {
  it("removes authenticated write policies on subscriptions", () => {
    const sql = read(migrationPath);

    expect(sql).toContain('drop policy if exists "subscriptions_insert_self" on public.subscriptions;');
    expect(sql).toContain('drop policy if exists "subscriptions_update_self" on public.subscriptions;');
    expect(sql).toContain('drop policy if exists "subscriptions_delete_self" on public.subscriptions;');

    expect(sql).not.toContain('create policy "subscriptions_insert_self"');
    expect(sql).not.toContain('create policy "subscriptions_update_self"');
    expect(sql).not.toContain('create policy "subscriptions_delete_self"');
  });

  it("keeps service_role as the only subscriptions writer for webhook/server flows", () => {
    const sql = read(migrationPath);

    expect(sql).toContain('create policy "Service role can manage subscriptions" on public.subscriptions');
    expect(sql).toContain("for all");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("using (auth.role() = 'service_role')");
    expect(sql).toContain("with check (auth.role() = 'service_role')");
  });

  it("drops legacy sync trigger/function that could mutate profiles from subscriptions rows", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("drop trigger if exists sync_subscription_to_profile_trigger on public.subscriptions;");
    expect(sql).toContain("drop function if exists public.sync_subscription_to_profile();");
  });
});
