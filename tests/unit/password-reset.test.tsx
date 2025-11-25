import "../helpers/testUtils";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { requestPasswordReset } from "@/services/passwordReset";
import { supabase } from "@/integrations/supabase/client";
import ResetPassword from "@/pages/ResetPassword";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { translations } from "@/i18n/translations";
import * as EnhancedAuthHook from "@/hooks/useEnhancedAuth";
import * as LanguageContext from "@/contexts/LanguageContext";
import { BrowserRouter } from "react-router-dom";

const VALID_EMAIL = "user@example.com";
const TURNSTILE_TOKEN = "turnstile-token";
const STRONG_PASSWORD = "StrongPassw0rd!";

const successText = translations.en.auth_reset_password_success;
const mismatchText = translations.en.auth_password_match_fail;

const buildEdgeFunctionError = (messageKey: string, status: number) => ({
  message: "Edge Function returned a non-2xx status code",
  context: {
    response: new Response(
      JSON.stringify({ messageKey }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    ),
  },
});

describe("requestPasswordReset", () => {
  let invokeMock: Mock;

  beforeEach(() => {
    invokeMock = supabase.functions.invoke as unknown as Mock;
    invokeMock.mockReset();
  });

  it("returns success when the edge function accepts the request", async () => {
    invokeMock.mockResolvedValue({
      data: { success: true, messageKey: "auth.forgot_password_success" },
      error: null,
    });

    const result = await requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(true);
    expect(result.messageKey).toBe("auth.forgot_password_success");
    expect(invokeMock).toHaveBeenCalledWith(
      "enhanced-auth?action=request-password-reset",
      expect.objectContaining({
        body: { email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN },
      }),
    );
  });

  it("captures Turnstile verification failures", async () => {
    const captchaError = buildEdgeFunctionError("auth.captcha_failed", 403);
    invokeMock.mockResolvedValue({ data: null, error: captchaError });

    const result = await requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.captcha_failed");
    expect(result.status).toBe(403);
    expect(result.shouldResetCaptcha).toBe(true);
  });

  it("propagates Supabase errors when the email cannot be sent", async () => {
    const serverError = buildEdgeFunctionError("auth.reset_password_failed", 502);
    invokeMock.mockResolvedValue({ data: null, error: serverError });

    const result = await requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.reset_password_failed");
    expect(result.status).toBe(502);
  });
});

describe("ResetPassword page", () => {
  let updateUserMock: Mock;
  let revokeAllSessionsMock: Mock;
  let enhancedAuthSpy: ReturnType<typeof vi.spyOn>;
  let languageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    updateUserMock = supabase.auth.updateUser as unknown as Mock;
    updateUserMock.mockReset();

    revokeAllSessionsMock = vi.fn().mockResolvedValue({ success: true });
    enhancedAuthSpy = vi
      .spyOn(EnhancedAuthHook, "useEnhancedAuth")
      .mockReturnValue({ revokeAllSessions: revokeAllSessionsMock } as any);

    languageSpy = vi.spyOn(LanguageContext, "useLanguage").mockReturnValue({
      language: "en",
      setLanguage: vi.fn(),
      t: translations.en,
    });

    window.history.pushState({}, "Test", "/auth/update-password?type=recovery&token_hash=abc");
    window.location.hash = "#access_token=test";
  });

  afterEach(() => {
    enhancedAuthSpy.mockRestore();
    languageSpy.mockRestore();
    window.location.hash = "";
  });

  const renderResetPassword = () =>
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

  it("updates the password when the inputs satisfy all requirements", async () => {
    updateUserMock.mockResolvedValue({ data: {}, error: null });

    renderResetPassword();

    const newPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_new);
    const confirmPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_confirm);
    const submitButton = await screen.findByRole("button", { name: translations.en.auth_reset_password_button });

    fireEvent.change(newPasswordInput, { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmPasswordInput, { target: { value: STRONG_PASSWORD } });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: STRONG_PASSWORD });
    });

    expect(await screen.findByText(successText)).toBeInTheDocument();
  });

  it("prevents submission when passwords do not match", async () => {
    renderResetPassword();

    const newPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_new);
    const confirmPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_confirm);
    const submitButton = await screen.findByRole("button", { name: translations.en.auth_reset_password_button });

    fireEvent.change(newPasswordInput, { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmPasswordInput, { target: { value: `${STRONG_PASSWORD}!` } });

    expect(await screen.findByText(mismatchText)).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
