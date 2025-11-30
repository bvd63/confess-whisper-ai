import { describe, expect, it, vi } from "vitest";
import { addTwentyFourHours, getBoostStatus } from "@/lib/boosts";

describe("getBoostStatus", () => {
  it("returns boosted state with whole hours", () => {
    const now = Date.now();
    const endsAt = new Date(now + 5 * 60 * 60 * 1000).toISOString();

    const status = getBoostStatus(endsAt, now);

    expect(status.isBoosted).toBe(true);
    expect(status.hoursLeft).toBe(5);
    expect(status.lessThanHour).toBe(false);
  });

  it("flags less than one hour remaining", () => {
    const now = Date.now();
    const endsAt = new Date(now + 25 * 60 * 1000).toISOString();

    const status = getBoostStatus(endsAt, now);

    expect(status.isBoosted).toBe(true);
    expect(status.hoursLeft).toBe(0);
    expect(status.lessThanHour).toBe(true);
  });

  it("returns not boosted when expired", () => {
    const now = Date.now();
    const endsAt = new Date(now - 5 * 60 * 1000).toISOString();

    const status = getBoostStatus(endsAt, now);

    expect(status.isBoosted).toBe(false);
    expect(status.hoursLeft).toBe(0);
    expect(status.lessThanHour).toBe(false);
  });
});

describe("addTwentyFourHours", () => {
  it("adds exactly 24 hours", () => {
    const base = Date.now();
    const endsAt = addTwentyFourHours(base);
    const diffMs = new Date(endsAt).getTime() - base;

    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });
});
