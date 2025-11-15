import { describe, it, expect } from "vitest";
import {
  sanitizeBasic,
  sanitizeDisplayName,
  clampIntensity,
  normalizeCategory,
  SUPPORTED_CATEGORIES,
  normalizeCreateConfessionPayload,
} from "../../supabase/functions/create-confession/utils";

describe("create-confession utils", () => {
  describe("sanitizeBasic", () => {
    it("strips null characters and script tags", () => {
      const input = "Hello\0 world<script>alert('xss')</script>";
      const result = sanitizeBasic(input);
      expect(result).toBe("Hello  world");
    });

    it("trims whitespace", () => {
      expect(sanitizeBasic("   confession   ")).toBe("confession");
    });
  });

  describe("sanitizeDisplayName", () => {
    it("allows alphanumeric, spaces, @ and -", () => {
      expect(sanitizeDisplayName("@User-Test 123")).toBe("@User-Test 123");
    });

    it("removes disallowed characters and enforces max length", () => {
      const value = "<b>User!</b>".repeat(10);
      const result = sanitizeDisplayName(value);
      expect(result).not.toContain("<");
      expect(result).not.toContain("!");
      expect(result!.length).toBeLessThanOrEqual(80);
    });

    it("returns null for empty or undefined values", () => {
      expect(sanitizeDisplayName("")).toBeNull();
      expect(sanitizeDisplayName(undefined)).toBeNull();
    });
  });

  describe("clampIntensity", () => {
    it("rounds and clamps to 0-10", () => {
      expect(clampIntensity(4.6)).toBe(5);
      expect(clampIntensity(15)).toBe(10);
      expect(clampIntensity(-3)).toBe(0);
    });

    it("returns null for non-numeric values", () => {
      expect(clampIntensity("5")).toBeNull();
      expect(clampIntensity(undefined)).toBeNull();
    });
  });

  describe("normalizeCategory", () => {
    it("returns matching category in lowercase", () => {
      expect(normalizeCategory("RELATIONSHIPS")).toBe("relationships");
    });

    it("falls back to other when unsupported", () => {
      expect(normalizeCategory("unknown")).toBe("other");
      expect(normalizeCategory(null)).toBe("other");
    });

    it("keeps set membership updated", () => {
      expect(SUPPORTED_CATEGORIES.has("relationships")).toBe(true);
    });
  });

  describe("normalizeCreateConfessionPayload", () => {
    it("sanitizes and normalizes valid payloads", () => {
      const result = normalizeCreateConfessionPayload({
        content: "  Hello<script>alert('x')</script> World  ",
        category: "WORK",
        communityId: "community-1",
        imageUrl: "https://example.com/image.png",
        isAnonymous: false,
        aiResponse: "   <b>AI reply</b>   ",
        mood: { mood: "Relaxed", intensity: 11.7 },
        captchaToken: "  token123  ",
        authorDisplayName: " <New_User!> ",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.content).toBe("Hello World");
      expect(result.data.category).toBe("work");
      expect(result.data.originalContentLength).toBe("  Hello<script>alert('x')</script> World  ".length);
      expect(result.data.contentLength).toBe(result.data.content.length);
      expect(result.data.isAnonymous).toBe(false);
      expect(result.data.authorDisplayName).toBe("New_User");
      expect(result.data.aiResponse).toBe("<b>AI reply</b>");
      expect(result.data.communityId).toBe("community-1");
      expect(result.data.imageUrl).toBe("https://example.com/image.png");
      expect(result.data.captchaToken).toBe("token123");
      expect(result.data.mood?.mood).toBe("Relaxed");
      expect(result.data.mood?.intensity).toBe(10);
    });

    it("rejects payloads without string content", () => {
      const result = normalizeCreateConfessionPayload({ content: null });
      expect(result).toEqual({ ok: false, error: { code: "INVALID_CONTENT", logReason: "missing_content" } });
    });

    it("rejects payloads with sanitized content shorter than 10 characters", () => {
      const result = normalizeCreateConfessionPayload({ content: "   too short  " });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe("CONTENT_TOO_SHORT");
        expect(result.error.logReason).toBe("content_too_short");
        expect(result.error.context.originalLength).toBe("   too short  ".length);
        expect(result.error.context.sanitizedLength).toBeLessThan(10);
      }
    });

    it("trims optional captcha tokens and returns null when absent", () => {
      const withToken = normalizeCreateConfessionPayload({ content: "sufficient content here", captchaToken: "  abc  " });
      const withoutToken = normalizeCreateConfessionPayload({ content: "another sufficient content" });

      if (!withToken.ok) throw new Error("expected success");
      expect(withToken.data.captchaToken).toBe("abc");

      if (!withoutToken.ok) throw new Error("expected success");
      expect(withoutToken.data.captchaToken).toBeNull();
    });
  });
});
