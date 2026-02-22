import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("start-trial proxy and onboarding wiring", () => {
  it("requires authenticated user and proxies activate-trial with internal secret server-side", () => {
    const source = read("supabase/functions/start-trial/index.ts");

    expect(source).toContain("getAuthenticatedRequestContext");
    expect(source).toContain('Deno.env.get("INTERNAL_JOB_SECRET")');
    expect(source).toContain('"x-internal-secret": internalSecret');
    expect(source).toContain('/functions/v1/activate-trial');
    expect(source).toContain("Authorization: `Bearer ${auth.context.token}`");
    expect(source).toContain("status: internalResponse.status");
  });

  it("uses start-trial from onboarding and avoids manual page reload", () => {
    const source = read("src/components/onboarding/VIPOnboardingModal.tsx");

    expect(source).toContain('supabase.functions.invoke("start-trial")');
    expect(source).not.toContain('supabase.functions.invoke("activate-trial")');
    expect(source).not.toContain("window.location.reload");
    expect(source).toContain("onTrialActivated?.()");
    expect(source).toContain('"TRIAL_ALREADY_USED"');
  });
});
