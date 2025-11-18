import "../helpers/testUtils";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEnhancedAuth } from "@/hooks/useEnhancedAuth";
import { supabase } from "@/integrations/supabase/client";
import * as ToastHook from "@/hooks/use-toast";
import * as LanguageContext from "@/contexts/LanguageContext";
import { useCaptchaChallenge } from "@/contexts/CaptchaChallengeContext";
import { translations } from "@/i18n/translations";

const ROTATE_SUCCESS = translations.en.settings_sessions_rotate_success;
const ROTATE_ERROR = translations.en.settings_sessions_rotate_error;
const TOAST_TITLE_SUCCESS = translations.en.common_success;
const TOAST_TITLE_ERROR = translations.en.common_error;
const CAPTCHA_FAILED = translations.en.auth_captcha_failed;

vi.mock("@/contexts/CaptchaChallengeContext", () => ({
  useCaptchaChallenge: vi.fn(),
}));

describe("useEnhancedAuth", () => {
  const toastMock = vi.fn();
  let toastSpy: ReturnType<typeof vi.spyOn>;
  let languageSpy: ReturnType<typeof vi.spyOn>;
  let functionsInvokeMock: Mock;
  let signOutMock: Mock;
  const captchaChallengeMock = vi.fn();
  const useCaptchaChallengeMock = useCaptchaChallenge as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    toastMock.mockReset();
    toastSpy = vi
      .spyOn(ToastHook, "useToast")
      .mockReturnValue({ toast: toastMock, toasts: [], dismiss: vi.fn() } as any);

    languageSpy = vi
      .spyOn(LanguageContext, "useLanguage")
      .mockReturnValue({
        language: "en",
        setLanguage: vi.fn(),
        t: translations.en,
      });

    functionsInvokeMock = supabase.functions.invoke as unknown as Mock;
    functionsInvokeMock.mockReset();

    signOutMock = supabase.auth.signOut as unknown as Mock;
    signOutMock.mockReset();

    captchaChallengeMock.mockReset();
    captchaChallengeMock.mockResolvedValue("captcha-token");
    useCaptchaChallengeMock.mockReturnValue(captchaChallengeMock);
  });

  afterEach(() => {
    toastSpy.mockRestore();
    languageSpy.mockRestore();
    localStorage.clear();
  });

  it("rotates the current session and updates stored tokens", async () => {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    functionsInvokeMock.mockImplementation(async (name: string) => {
      if (name === "enhanced-auth?action=refresh-session") {
        return {
          data: {
            refreshToken: "rotated-token",
            expiresAt,
            stayConnected: true,
            sessionId: "session-1",
          },
          error: null,
        };
      }

      if (name === "enhanced-auth?action=list-sessions") {
        return { data: { sessions: [] }, error: null };
      }

      return { data: null, error: null };
    });

    localStorage.setItem("refresh_token", "initial-token");
    localStorage.setItem("device_id", "device-123");
    localStorage.setItem("stay_signed_in", "true");

    const { result } = renderHook(() => useEnhancedAuth());

    await act(async () => {
      const response = await result.current.rotateCurrentSession();
      expect(response).toEqual({ success: true, error: null });
    });

    expect(functionsInvokeMock).toHaveBeenCalledWith(
      "enhanced-auth?action=refresh-session",
      expect.objectContaining({
        body: expect.objectContaining({
          refreshToken: "initial-token",
          sessionMetadata: expect.objectContaining({
            deviceId: "device-123",
            stayConnected: true,
          }),
        }),
      })
    );

    expect(localStorage.getItem("refresh_token")).toBe("rotated-token");
    expect(localStorage.getItem("refresh_expires_at")).toBe(expiresAt);
    expect(localStorage.getItem("stay_signed_in")).toBe("true");

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TOAST_TITLE_SUCCESS,
        description: ROTATE_SUCCESS,
      })
    );

    expect(functionsInvokeMock).toHaveBeenCalledWith(
      "enhanced-auth?action=list-sessions",
      expect.any(Object)
    );
    expect(result.current.loading).toBe(false);
  });

  it("retries rotation with captcha token when backend requires challenge", async () => {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const rotationResponses = [
      {
        data: { requiresCaptcha: true, error: "CAPTCHA_REQUIRED" },
        error: null,
      },
      {
        data: {
          refreshToken: "rotated-token",
          expiresAt,
          stayConnected: false,
        },
        error: null,
      },
    ];

    functionsInvokeMock.mockImplementation(async (name: string) => {
      if (name === "enhanced-auth?action=refresh-session") {
        return rotationResponses.shift()!;
      }
      if (name === "enhanced-auth?action=list-sessions") {
        return { data: { sessions: [] }, error: null };
      }
      return { data: null, error: null };
    });

    localStorage.setItem("refresh_token", "initial-token");

    const { result } = renderHook(() => useEnhancedAuth());

    await act(async () => {
      const response = await result.current.rotateCurrentSession();
      expect(response).toEqual({ success: true, error: null });
    });

    expect(captchaChallengeMock).toHaveBeenCalledWith({ reason: "session_rotation" });
    expect(functionsInvokeMock.mock.calls).toEqual(
      expect.arrayContaining([
        [
          "enhanced-auth?action=refresh-session",
          expect.objectContaining({
            body: expect.objectContaining({ captchaToken: "captcha-token" }),
          }),
        ],
      ])
    );
    expect(localStorage.getItem("refresh_token")).toBe("rotated-token");
  });

  it("shows captcha error toast when user dismisses challenge", async () => {
    captchaChallengeMock.mockRejectedValue(new Error("captcha_cancelled"));

    functionsInvokeMock.mockResolvedValue({
      data: { requiresCaptcha: true },
      error: null,
    });

    localStorage.setItem("refresh_token", "initial-token");

    const { result } = renderHook(() => useEnhancedAuth());

    await act(async () => {
      const response = await result.current.rotateCurrentSession();
      expect(response.error).toBeTruthy();
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TOAST_TITLE_ERROR,
        description: CAPTCHA_FAILED,
        variant: "destructive",
      })
    );
  });

  it("surfaces an error when no refresh token is available", async () => {
    const { result } = renderHook(() => useEnhancedAuth());

    await act(async () => {
      const response = await result.current.rotateCurrentSession();
      expect(response.error).toBeTruthy();
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TOAST_TITLE_ERROR,
        description: ROTATE_ERROR,
        variant: "destructive",
      })
    );
    expect(result.current.loading).toBe(false);
  });

  it("clears credentials and signs out when refresh rotation is unauthorized", async () => {
    functionsInvokeMock.mockResolvedValue({
      data: null,
      error: { status: 401 },
    });

    localStorage.setItem("refresh_token", "initial-token");
    localStorage.setItem("device_id", "device-123");
    localStorage.setItem("refresh_expires_at", "2025-12-01T00:00:00.000Z");
    localStorage.setItem("stay_signed_in", "false");

    const { result } = renderHook(() => useEnhancedAuth());

    await act(async () => {
      const response = await result.current.rotateCurrentSession();
      expect(response.error).toBeTruthy();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("device_id")).toBeNull();
    expect(localStorage.getItem("refresh_expires_at")).toBeNull();
    expect(localStorage.getItem("stay_signed_in")).toBeNull();

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TOAST_TITLE_ERROR,
        description: ROTATE_ERROR,
        variant: "destructive",
      })
    );
    expect(result.current.loading).toBe(false);
  });
});
