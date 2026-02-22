import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("trial expiry cron wiring and legacy guard migration", () => {
  it("adds scheduled GitHub workflow for internal trial expiry checks", () => {
    const workflow = read(".github/workflows/check-trial-expiry-cron.yml");

    expect(workflow).toContain('cron: "15 3 * * *"');
    expect(workflow).toContain("SUPABASE_URL: ${{ secrets.SUPABASE_URL }}");
    expect(workflow).toContain("SUPABASE_INTERNAL_SECRET: ${{ secrets.SUPABASE_INTERNAL_SECRET }}");
    expect(workflow).toContain("/functions/v1/check-trial-expiry");
    expect(workflow).toContain("x-internal-secret");
  });

  it("documents required cron secrets in ops docs", () => {
    const opsDoc = read("docs/ops.md");

    expect(opsDoc).toContain(".github/workflows/check-trial-expiry-cron.yml");
    expect(opsDoc).toContain("SUPABASE_URL");
    expect(opsDoc).toContain("SUPABASE_INTERNAL_SECRET");
  });
});
