import { describe, it, expect } from "vitest";
import {
  sanitizeDetails,
  isValidUuid,
  normalizeReason,
  normalizeLanguage,
  ALLOWED_REASONS,
  normalizeReportPayload,
} from "../../supabase/functions/report-confession/utils";

describe("report-confession utils", () => {
  describe("sanitizeDetails", () => {
    it("returns null for non-string inputs", () => {
      expect(sanitizeDetails(undefined)).toBeNull();
      expect(sanitizeDetails(42)).toBeNull();
    });

    it("trims whitespace and enforces max length", () => {
      const padded = "   suspicious content   ";
      expect(sanitizeDetails(padded)).toBe("suspicious content");

      const long = "x".repeat(1500);
      expect(sanitizeDetails(long)?.length).toBe(1000);
    });
  });

  describe("isValidUuid", () => {
    it("accepts canonical UUID v4 strings", () => {
      expect(isValidUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });

    it("rejects malformed values", () => {
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidUuid(null)).toBe(false);
    });
  });

  describe("normalizeReason", () => {
    it("normalizes case to lowercase when allowed", () => {
      expect(normalizeReason("SPAM")).toBe("spam");
    });

    it("returns null when reason is not permitted", () => {
      expect(normalizeReason("made_up_reason")).toBeNull();
      expect(normalizeReason(undefined)).toBeNull();
    });

    it("keeps allowed reasons accessible", () => {
      expect(ALLOWED_REASONS.has("spam")).toBe(true);
    });
  });

  describe("normalizeLanguage", () => {
    it("returns null for non-string values", () => {
      expect(normalizeLanguage(null)).toBeNull();
      expect(normalizeLanguage(123)).toBeNull();
    });

    it("lowercases, strips invalid characters, and limits length", () => {
      expect(normalizeLanguage(" EN-us ")).toBe("en-us");
      expect(normalizeLanguage("français")).toBe("frana");
    });

    it("returns null when cleaned value is empty", () => {
      expect(normalizeLanguage("***")).toBeNull();
    });
  });

  describe("normalizeReportPayload", () => {
    const base = {
      confessionId: "123e4567-e89b-12d3-a456-426614174000",
      reason: "spam",
      details: " suspicious  ",
      language: " ES-mx ",
    };

    it("returns normalized payload when inputs are valid", () => {
      const result = normalizeReportPayload(base);
      expect(result).toEqual({
        ok: true,
        data: {
          confessionId: base.confessionId,
          reason: "spam",
          details: "suspicious",
          language: "es-mx",
        },
      });
    });

    it("rejects invalid confession id", () => {
      const result = normalizeReportPayload({ ...base, confessionId: "bad" });
      expect(result).toEqual({ ok: false, error: "INVALID_CONFESSION" });
    });

    it("rejects invalid reason", () => {
      const result = normalizeReportPayload({ ...base, reason: "invalid" });
      expect(result).toEqual({ ok: false, error: "INVALID_REASON" });
    });

    it("treats non-object payload as invalid confession", () => {
      expect(normalizeReportPayload(null)).toEqual({ ok: false, error: "INVALID_CONFESSION" });
    });
  });
});
