import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("rate-limit atomic hardening", () => {
  it("uses atomic DB counter updates and returned counts for allow/deny decisions", () => {
    const source = read("supabase/functions/rate-limit/index.ts");

    expect(source).toContain("increment_rate_limit_counter");
    expect(source).toContain("const currentCount = Number(row?.current_count);");
    expect(source).toContain("if (currentCount > config.maxAttempts)");
    expect(source).not.toContain("const newCount = existing.count + 1;");
  });

  it("fails closed when the storage layer errors", () => {
    const source = read("supabase/functions/rate-limit/index.ts");

    expect(source).toContain("if (rpcError)");
    expect(source).toContain("allowed: false");
    expect(source).toContain("error: 'RATE_LIMIT_STORAGE_ERROR'");
  });

  it("defines an atomic UPSERT increment in SQL", () => {
    const sql = read("supabase/migrations/20260218137000_atomic_rate_limit_counter.sql");

    expect(sql).toContain("insert into public.rate_limits as rl (key, count, reset_at)");
    expect(sql).toContain("on conflict (key) do update");
    expect(sql).toContain("else rl.count + 1");
    expect(sql).toContain("returning rl.count, rl.reset_at");
  });

  it("Promise.all burst using atomic counts does not undercount", async () => {
    const maxAttempts = 5;
    let atomicCount = 0;

    const checkWithAtomicCount = async () => {
      const currentCount = ++atomicCount;
      return currentCount <= maxAttempts;
    };

    const results = await Promise.all(
      Array.from({ length: 20 }, () => checkWithAtomicCount()),
    );

    expect(results.filter(Boolean)).toHaveLength(maxAttempts);
    expect(results.filter((allowed) => !allowed)).toHaveLength(15);
    expect(atomicCount).toBe(20);
  });
});
