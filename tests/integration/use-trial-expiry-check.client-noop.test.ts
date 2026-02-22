import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("useTrialExpiryCheck client behavior", () => {
  it("does not call internal check-trial-expiry endpoint from browser", () => {
    const source = read("src/hooks/useTrialExpiryCheck.ts");

    expect(source).not.toContain("supabase.functions.invoke('check-trial-expiry')");
    expect(source).not.toContain("setInterval(checkTrialExpiry");
    expect(source).toContain("internal scheduler/job");
  });
});
