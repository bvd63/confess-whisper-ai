import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSubscriptionBonusIdempotencyKey,
  stableUuidFromString,
} from "../../supabase/functions/award-subscription-coins/utils";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("award-subscription-coins idempotency hardening", () => {
  it("parallel calls compute the same deterministic reference id (single-award key)", async () => {
    const key = buildSubscriptionBonusIdempotencyKey({
      userId: "user-1",
      tier: "vip",
      subscriptionId: "sub_123",
      subscriptionEndsAt: "2026-03-01T00:00:00.000Z",
    });

    const ids = await Promise.all(Array.from({ length: 8 }, () => stableUuidFromString(key)));
    const unique = new Set(ids);
    expect(unique.size).toBe(1);
  });

  it("retries for a different billing period produce a different idempotency key", async () => {
    const firstKey = buildSubscriptionBonusIdempotencyKey({
      userId: "user-1",
      tier: "vip",
      subscriptionId: "sub_123",
      subscriptionEndsAt: "2026-03-01T00:00:00.000Z",
    });
    const secondKey = buildSubscriptionBonusIdempotencyKey({
      userId: "user-1",
      tier: "vip",
      subscriptionId: "sub_123",
      subscriptionEndsAt: "2026-04-01T00:00:00.000Z",
    });

    const firstRef = await stableUuidFromString(firstKey);
    const secondRef = await stableUuidFromString(secondKey);
    expect(firstRef).not.toBe(secondRef);
  });

  it("enforces DB-level uniqueness for subscription bonus reference ids", () => {
    const sql = read("supabase/migrations/20260218135000_subscription_bonus_coin_idempotency.sql");
    expect(sql).toContain("create unique index if not exists idx_coin_transactions_subscription_bonus_idempotency");
    expect(sql).toContain("on public.coin_transactions (user_id, type, reference_id)");
    expect(sql).toContain("type like 'subscription_%_bonus'");
  });
});
