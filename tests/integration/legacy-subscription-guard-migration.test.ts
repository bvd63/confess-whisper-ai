import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("legacy subscription guard migration", () => {
  it("keeps legacy sync objects disabled and removes authenticated write policies", () => {
    const sql = read("supabase/migrations/20260218140000_guard_legacy_subscription_objects.sql");

    expect(sql).toContain("alter table if exists public.subscriptions enable row level security;");
    expect(sql).toContain("drop trigger if exists sync_subscription_to_profile_trigger on public.subscriptions;");
    expect(sql).toContain("drop function if exists public.sync_subscription_to_profile();");
    expect(sql).toContain('drop policy if exists "subscriptions_insert_self" on public.subscriptions;');
    expect(sql).toContain('drop policy if exists "subscriptions_update_self" on public.subscriptions;');
    expect(sql).toContain('drop policy if exists "subscriptions_delete_self" on public.subscriptions;');
    expect(sql).toContain('create policy "Service role can manage subscriptions" on public.subscriptions');
  });
});
