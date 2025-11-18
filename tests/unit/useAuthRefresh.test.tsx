import "../helpers/testUtils";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/contexts/CaptchaChallengeContext", () => ({
  useCaptchaChallenge: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  observability: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuthRefresh } from "@/hooks/useAuthRefresh";
import { supabase } from "@/integrations/supabase/client";
import { useCaptchaChallenge } from "@/contexts/CaptchaChallengeContext";

const getSessionMock = supabase.auth.getSession as unknown as Mock;
const refreshSessionMock = supabase.auth.refreshSession as unknown as Mock;
const signOutMock = supabase.auth.signOut as unknown as Mock;
const functionsInvokeMock = supabase.functions.invoke as unknown as Mock;
const requestChallengeMock = useCaptchaChallenge as unknown as Mock;

describe("useAuthRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    localStorage.clear();
    vi.clearAllMocks();
    requestChallengeMock.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("refreshes the Supabase session and rotates managed tokens", async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 300 } },
      error: null,
    });

    refreshSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 900 } },
      error: null,
    });

    functionsInvokeMock.mockImplementationOnce(async (name: string) => {
      if (name === "enhanced-auth?action=refresh-session") {
        return {
          data: {
            refreshToken: "rotated-token",
            expiresAt: "2025-12-12T00:00:00.000Z",
            stayConnected: true,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    localStorage.setItem("refresh_token", "initial-token");
    localStorage.setItem("device_id", "device-xyz");
    localStorage.setItem("stay_signed_in", "true");

    const { unmount } = renderHook(() => useAuthRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(functionsInvokeMock).toHaveBeenCalledWith(
      "enhanced-auth?action=refresh-session",
      expect.objectContaining({
        body: expect.objectContaining({
          refreshToken: "initial-token",
          sessionMetadata: expect.objectContaining({
            deviceId: "device-xyz",
            stayConnected: true,
          }),
        }),
      })
    );

    expect(localStorage.getItem("refresh_token")).toBe("rotated-token");
    expect(localStorage.getItem("refresh_expires_at")).toBe("2025-12-12T00:00:00.000Z");
    expect(localStorage.getItem("stay_signed_in")).toBe("true");

    unmount();
  });

  it("prompts for captcha on managed rotation and retries with token", async () => {
    const challengeResolver = vi.fn().mockResolvedValue("captcha-token");
    requestChallengeMock.mockReturnValue(challengeResolver);

    getSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 300 } },
      error: null,
    });

    refreshSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 900 } },
      error: null,
    });

    const rotationResponses = [
      {
        data: { requiresCaptcha: true, error: "CAPTCHA_REQUIRED" },
        error: null,
      },
      {
        data: {
          refreshToken: "rotated-token",
          expiresAt: "2025-12-12T00:00:00.000Z",
          stayConnected: false,
        },
        error: null,
      },
    ];

    functionsInvokeMock.mockImplementation(async () => rotationResponses.shift()!);

    localStorage.setItem("refresh_token", "initial-token");

    renderHook(() => useAuthRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(challengeResolver).toHaveBeenCalledWith({ reason: "auth_refresh" });
    expect(functionsInvokeMock).toHaveBeenNthCalledWith(
      2,
      "enhanced-auth?action=refresh-session",
      expect.objectContaining({
        body: expect.objectContaining({ captchaToken: "captcha-token" }),
      })
    );
    expect(localStorage.getItem("refresh_token")).toBe("rotated-token");
  });

  it("logs when captcha challenge is dismissed and does not rotate", async () => {
    const challengeResolver = vi.fn().mockRejectedValue(new Error("captcha_cancelled"));
    requestChallengeMock.mockReturnValue(challengeResolver);

    getSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 300 } },
      error: null,
    });

    refreshSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 900 } },
      error: null,
    });

    functionsInvokeMock.mockResolvedValue({
      data: { requiresCaptcha: true },
      error: null,
    });

    localStorage.setItem("refresh_token", "initial-token");

    renderHook(() => useAuthRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(challengeResolver).toHaveBeenCalledTimes(1);
    expect(functionsInvokeMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("refresh_token")).toBe("initial-token");
  });

  it("does nothing when no active session is present", async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

    const { unmount } = renderHook(() => useAuthRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(refreshSessionMock).not.toHaveBeenCalled();

    unmount();
  });

  it("signs out and redirects when refresh fails", async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { expires_at: 300 } },
      error: null,
    });

    refreshSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "invalid" },
    });

    localStorage.setItem("refresh_token", "initial-token");

    const originalLocation = window.location;
    let capturedHref = "http://localhost/";

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return capturedHref;
        },
        set href(value: string) {
          capturedHref = value;
        },
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      } as unknown as Location,
    });
    const { unmount } = renderHook(() => useAuthRefresh());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(capturedHref).toBe("/auth");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    unmount();
  });
});
