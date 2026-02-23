import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkLoginRateLimitFailOpen } from "../../supabase/functions/enhanced-auth/login-rate-limit";

describe("enhanced-auth login rate-limit fail-closed", () => {
  it("treats transport failures as unavailable and blocks login", async () => {
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

    expect(decision).toMatchObject({ denied: true, unavailable: true });
  });

  it("denies by the third rapid response when backend starts returning 429", async () => {
    const responses = [
      new Response(JSON.stringify({ allowed: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
      new Response(JSON.stringify({ allowed: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
      new Response(
        JSON.stringify({ error: "RATE_LIMIT", retryAfter: 30, remaining: 0, identifierType: "ip" }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "30" } },
      ),
    ];
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);

    const first = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      action: "auth_login",
      ip: "203.0.113.10",
      fetchImpl: mockFetch,
    });
    const second = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      action: "auth_login",
      ip: "203.0.113.10",
      fetchImpl: mockFetch,
    });
    const third = await checkLoginRateLimitFailOpen({
      supabaseUrl: "https://example.supabase.co",
      internalJobSecret: "secret",
      action: "auth_login",
      ip: "203.0.113.10",
      fetchImpl: mockFetch,
    });

    expect(first).toMatchObject({ denied: false, unavailable: false });
    expect(second).toMatchObject({ denied: false, unavailable: false });
    expect(third).toMatchObject({ denied: true, unavailable: false, retryAfter: 30, remaining: 0 });
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

  it("treats RATE_LIMIT_UNAVAILABLE responses as unavailable and blocks login", async () => {
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

    expect(decision).toMatchObject({ denied: true, unavailable: true });
  });

  it("keeps enhanced-login fail-closed without fail-open bypass logs", () => {
    const source = readFileSync(
      resolve(process.cwd(), "supabase/functions/enhanced-auth/index.ts"),
      "utf8",
    );

    const loginCaseStart = source.indexOf("case 'enhanced-login':");
    const refreshCaseStart = source.indexOf("case 'refresh-session':");
    expect(loginCaseStart).toBeGreaterThan(-1);
    expect(refreshCaseStart).toBeGreaterThan(loginCaseStart);

    const enhancedLoginBlock = source.slice(loginCaseStart, refreshCaseStart);
    expect(enhancedLoginBlock).toContain("blocking login fail-closed");
    expect(enhancedLoginBlock).toContain("RATE_LIMIT_UNAVAILABLE");
    expect(enhancedLoginBlock).not.toContain("proceeding fail-open");
  });
});
