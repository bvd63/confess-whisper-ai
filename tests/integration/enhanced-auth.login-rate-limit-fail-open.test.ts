import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkLoginRateLimitFailOpen } from "../../supabase/functions/enhanced-auth/login-rate-limit";

describe("enhanced-auth login rate-limit fail-open", () => {
  it("treats transport failures as unavailable and fail-open", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network down"));

    const decision = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      authorizationHeader: "Bearer token",
      action: "auth_login",
      ip: "203.0.113.10",
      timeoutMs: 1200,
      fetchImpl: mockFetch,
    });

    expect(decision).toEqual({ denied: false, unavailable: true });
  });

  it("keeps explicit rate-limit denial blocking login", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "RATE_LIMIT",
          retryAfter: 30,
          remaining: 0,
          identifierType: "ip",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    const decision = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      action: "auth_login",
      ip: "203.0.113.10",
      fetchImpl: mockFetch,
    });

    expect(decision).toEqual({
      denied: true,
      unavailable: false,
      retryAfter: 30,
      remaining: 0,
      identifierType: "ip",
    });
  });

  it("treats RATE_LIMIT_UNAVAILABLE responses as unavailable and fail-open", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "RATE_LIMIT_UNAVAILABLE",
          messageKey: "common.something_went_wrong",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );

    const decision = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      action: "auth_login",
      ip: "203.0.113.10",
      fetchImpl: mockFetch,
    });

    expect(decision).toEqual({ denied: false, unavailable: true });
  });

  it("keeps enhanced-login fail-open without RATE_LIMIT_UNAVAILABLE fallback", () => {
    const source = readFileSync(
      resolve(process.cwd(), "supabase/functions/enhanced-auth/index.ts"),
      "utf8",
    );

    const loginCaseStart = source.indexOf("case 'enhanced-login':");
    const refreshCaseStart = source.indexOf("case 'refresh-session':");
    expect(loginCaseStart).toBeGreaterThan(-1);
    expect(refreshCaseStart).toBeGreaterThan(loginCaseStart);

    const enhancedLoginBlock = source.slice(loginCaseStart, refreshCaseStart);
    expect(enhancedLoginBlock).toContain("rate-limit check threw; proceeding fail-open");
    expect(enhancedLoginBlock).not.toContain("RATE_LIMIT_UNAVAILABLE");
    expect(enhancedLoginBlock).not.toContain("status: 503");
  });
});
