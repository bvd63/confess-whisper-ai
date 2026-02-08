import "../helpers/testUtils";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import * as PasswordResetService from "@/services/passwordReset";
import { env } from "@/lib/env";
import ResetPassword from "@/pages/ResetPassword";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { translations } from "@/i18n/translations";
import * as LanguageContext from "@/contexts/LanguageContext";
import { BrowserRouter } from "react-router-dom";

const VALID_EMAIL = "user@example.com";
const TURNSTILE_TOKEN = "turnstile-token";
const STRONG_PASSWORD = "StrongPassw0rd!";

const successText = translations.en.auth_reset_password_success;
const mismatchText = translations.en.auth_password_match_fail;

const originalFetch = globalThis.fetch;

const createJsonResponse = (body: Record<string, unknown>, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

describe("requestPasswordReset", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns success when the edge function accepts the request", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ success: true, messageKey: "auth.forgot_password_success" }));

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(true);
    expect(result.messageKey).toBe("auth.forgot_password_success");
    expect(fetchMock).toHaveBeenCalledWith(
      `${env.client.supabaseUrl.replace(/\/$/, "")}/functions/v1/enhanced-auth?action=request-password-reset`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN }),
      }),
    );
  });

  it("captures Turnstile verification failures", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ error: "CAPTCHA_FAILED", messageKey: "auth.captcha_failed" }, { status: 400 }));

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.captcha_failed");
    expect(result.status).toBe(400);
    expect(result.shouldResetCaptcha).toBe(true);
  });

  it("propagates Supabase errors when the email cannot be sent", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ error: "RESET_FAILED", messageKey: "auth.reset_password_failed" }, { status: 500 }));

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.reset_password_failed");
    expect(result.status).toBe(500);
  });
});

describe("ResetPassword page", () => {
  let validateResetTokenMock: ReturnType<typeof vi.spyOn>;
  let completePasswordResetMock: ReturnType<typeof vi.spyOn>;
  let languageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    validateResetTokenMock = vi.spyOn(PasswordResetService, "validateResetToken");
    completePasswordResetMock = vi.spyOn(PasswordResetService, "completePasswordReset");
    validateResetTokenMock.mockResolvedValue({ valid: true });
    completePasswordResetMock.mockResolvedValue({ success: true });

    languageSpy = vi.spyOn(LanguageContext, "useLanguage").mockReturnValue({
      language: "en",
      setLanguage: vi.fn(),
      t: translations.en,
    });

    window.history.pushState({}, "Test", "/reset-password?token=valid-token");
  });

  afterEach(() => {
    validateResetTokenMock.mockRestore();
    completePasswordResetMock.mockRestore();
    languageSpy.mockRestore();
  });

  const renderResetPassword = () =>
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

  it("updates the password when the inputs satisfy all requirements", async () => {
    validateResetTokenMock.mockResolvedValue({ valid: true });
    completePasswordResetMock.mockResolvedValue({ success: true });

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
      expect(completePasswordResetMock).toHaveBeenCalledWith({ token: "valid-token", password: STRONG_PASSWORD });
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
    fireEvent.click(submitButton);

    expect(await screen.findByText(mismatchText)).toBeInTheDocument();
    expect(completePasswordResetMock).not.toHaveBeenCalled();
  });

  it("shows the invalid link UI when recovery parameters are missing", async () => {
    window.history.pushState({}, "Test", "/reset-password");
    validateResetTokenMock.mockResolvedValue({ valid: false });

    renderResetPassword();

    expect(await screen.findByText(translations.en.auth_reset_token_invalid)).toBeInTheDocument();
    expect(screen.getByText(translations.en.auth_reset_token_expired)).toBeInTheDocument();
  });

  it("treats Supabase expired-session errors as invalid reset links", async () => {
    validateResetTokenMock.mockResolvedValue({ valid: true });
    completePasswordResetMock.mockResolvedValue({ success: false, invalidToken: true });

    renderResetPassword();

    const newPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_new);
    const confirmPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_confirm);
    const submitButton = await screen.findByRole("button", { name: translations.en.auth_reset_password_button });

    fireEvent.change(newPasswordInput, { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmPasswordInput, { target: { value: STRONG_PASSWORD } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(translations.en.auth_reset_token_invalid)).toBeInTheDocument();
  });
});
