import { describe, it, expect } from "vitest";
import {
  normalizeRateLimitRequest,
  RATE_LIMIT_CONFIGS,
} from "../../supabase/functions/rate-limit/utils";

describe("rate-limit utils", () => {
  describe("normalizeRateLimitRequest", () => {
    it("returns normalized payload including user and ip identifiers", () => {
      const result = normalizeRateLimitRequest({
        action: " report_confession ",
        userId: " user-123 ",
        ip: "203.0.113.10",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "report_confession",
          identifiers: [
            { value: "user-123", type: "user" },
            { value: "203.0.113.10", type: "ip" },
          ],
          config: RATE_LIMIT_CONFIGS.report_confession,
        },
      });
    });

    it("falls back to ip when userId is missing", () => {
      const result = normalizeRateLimitRequest({
        action: "message_send",
        ip: " 198.51.100.42 ",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "message_send",
          identifiers: [{ value: "198.51.100.42", type: "ip" }],
          config: RATE_LIMIT_CONFIGS.message_send,
        },
      });
    });

    it("uses default config for unknown actions while preserving sanitized action", () => {
      const result = normalizeRateLimitRequest({
        action: "  Custom-ACTION!  ",
        ip: "10.0.0.1",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "custom-action",
          identifiers: [{ value: "10.0.0.1", type: "ip" }],
          config: RATE_LIMIT_CONFIGS.default,
        },
      });
    });

    it("applies auth-specific rate limit config", () => {
      const result = normalizeRateLimitRequest({
        action: "auth_login",
        ip: "198.51.100.42",
        userId: "user@example.com",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "auth_login",
          identifiers: [
            { value: "userexample.com", type: "user" },
            { value: "198.51.100.42", type: "ip" },
          ],
          config: RATE_LIMIT_CONFIGS.auth_login,
        },
      });
    });

    it("applies login pre-check rate limit config", () => {
      const result = normalizeRateLimitRequest({
        action: "login",
        ip: "198.51.100.42",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "login",
          identifiers: [{ value: "198.51.100.42", type: "ip" }],
          config: RATE_LIMIT_CONFIGS.login,
        },
      });
    });

    it("applies dedicated free AI response config", () => {
      const result = normalizeRateLimitRequest({
        action: "ai_response_free",
        userId: "user-1",
      });

      expect(result).toEqual({
        ok: true,
        data: {
          action: "ai_response_free",
          identifiers: [{ value: "user-1", type: "user" }],
          config: RATE_LIMIT_CONFIGS.ai_response_free,
        },
      });
    });

    it("keeps VIP AI limit higher than free for the same burst", () => {
      const freeLimit = RATE_LIMIT_CONFIGS.ai_response_free.maxAttempts;
      const vipLimit = RATE_LIMIT_CONFIGS.ai_response_vip.maxAttempts;
      const sameBurst = freeLimit + 1;

      expect(sameBurst > freeLimit).toBe(true);
      expect(sameBurst > vipLimit).toBe(false);
      expect(vipLimit).toBeGreaterThan(freeLimit);
    });

    it("rejects requests with no action", () => {
      const result = normalizeRateLimitRequest({ userId: "abc" });
      expect(result).toEqual({ ok: false, error: "MISSING_ACTION" });
    });

    it("rejects requests without identifiers", () => {
      const result = normalizeRateLimitRequest({ action: "confession_create" });
      expect(result).toEqual({ ok: false, error: "MISSING_IDENTIFIER" });
    });

    it("rejects non-object payloads", () => {
      expect(normalizeRateLimitRequest(null)).toEqual({ ok: false, error: "INVALID_JSON" });
      expect(normalizeRateLimitRequest("test")).toEqual({ ok: false, error: "INVALID_JSON" });
    });
  });
});
