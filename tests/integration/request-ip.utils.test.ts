import { describe, expect, it } from "vitest";
import { getClientIp, parseForwardedForFirstIp } from "../../supabase/functions/_shared/request-ip";

describe("request IP helper", () => {
  it("does not trust x-forwarded-for when TRUST_PROXY is disabled", () => {
    const req = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "198.51.100.24, 10.0.0.1",
        "x-real-ip": "198.51.100.24",
      },
    });

    expect(getClientIp(req, { trustProxy: false })).toBe("unknown");
  });

  it("uses first forwarded IP when TRUST_PROXY is enabled", () => {
    const req = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "198.51.100.24, 10.0.0.1",
      },
    });

    expect(getClientIp(req, { trustProxy: true })).toBe("198.51.100.24");
    expect(parseForwardedForFirstIp("198.51.100.24, 10.0.0.1")).toBe("198.51.100.24");
  });

  it("prefers platform-provided IP headers regardless of TRUST_PROXY", () => {
    const req = new Request("https://example.test", {
      headers: {
        "cf-connecting-ip": "203.0.113.17",
        "x-forwarded-for": "198.51.100.24",
      },
    });

    expect(getClientIp(req, { trustProxy: false })).toBe("203.0.113.17");
  });
});
