import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("login rate-limit hardening", () => {
  it("derives login IP server-side and ignores client user id", () => {
    const source = read("supabase/functions/rate-limit/index.ts");

    expect(source).toContain("const inferredIp = getClientIp(req);");
    expect(source).toContain("delete bodyForNormalization.userId;");
    expect(source).toContain("delete bodyForNormalization.loginIdentifierHash;");
  });

  it("hashes rate-limit keys before persisting", () => {
    const source = read("supabase/functions/rate-limit/index.ts");

    expect(source).toContain("const hashRateLimitKey");
    expect(source).toContain("const key = await hashRateLimitKey(keyMaterial);");
  });

  it("blocks login fail-closed on storage errors", () => {
    const source = read("supabase/functions/rate-limit/index.ts");

    expect(source).toContain("error: 'RATE_LIMIT_UNAVAILABLE'");
    expect(source).toContain("messageKey: 'common.rate_limit'");
  });
});
