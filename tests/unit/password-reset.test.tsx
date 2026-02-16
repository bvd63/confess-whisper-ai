import "../helpers/testUtils";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import * as PasswordResetService from "@/services/passwordReset";
import ResetPassword from "@/pages/ResetPassword";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { translations } from "@/i18n/translations";
import * as LanguageContext from "@/contexts/LanguageContext";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VALID_EMAIL = "user@example.com";
const TURNSTILE_TOKEN = "turnstile-token";
const STRONG_PASSWORD = "StrongPassw0rd!";

const successText = translations.en.auth_reset_password_success;
const mismatchText = translations.en.auth_password_match_fail;

describe("requestPasswordReset", () => {
  const invokeMock = supabase.functions.invoke as Mock;

  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("returns success when the edge function accepts the request", async () => {
    invokeMock.mockResolvedValue({
      data: { success: true, messageKey: "auth.forgot_password_success" },
      error: null,
    });

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(true);
    expect(result.messageKey).toBe("auth.forgot_password_success");
    expect(invokeMock).toHaveBeenCalledWith("enhanced-auth", {
      body: {
        action: "request-password-reset",
        email: VALID_EMAIL,
        captchaToken: TURNSTILE_TOKEN,
      },
    });
  });

  it("captures Turnstile verification failures", async () => {
    invokeMock.mockResolvedValue({
      data: { error: "CAPTCHA_FAILED", messageKey: "auth.captcha_failed" },
      error: { status: 400 },
    });

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.captcha_failed");
    expect(result.status).toBe(400);
    expect(result.shouldResetCaptcha).toBe(true);
  });

  it("propagates Supabase errors when the email cannot be sent", async () => {
    invokeMock.mockResolvedValue({
      data: { error: "RESET_FAILED", messageKey: "auth.reset_password_failed" },
      error: { status: 500 },
    });

    const result = await PasswordResetService.requestPasswordReset({ email: VALID_EMAIL, captchaToken: TURNSTILE_TOKEN });

    expect(result.success).toBe(false);
    expect(result.messageKey).toBe("auth.reset_password_failed");
    expect(result.status).toBe(500);
  });
});

describe("ResetPassword page", () => {
  let languageSpy: ReturnType<typeof vi.spyOn>;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    // Clear all mock call histories before each test
    vi.clearAllMocks();

    languageSpy = vi.spyOn(LanguageContext, "useLanguage").mockReturnValue({
      language: "en",
      setLanguage: vi.fn(),
      t: translations.en,
    });

    // Default: getSession returns a valid session (component will transition to "ready")
    (supabase.auth.getSession as Mock).mockResolvedValue({
      data: { session: { user: { id: "test-user" }, access_token: "mock-token" } },
    });

    // Default: onAuthStateChange does not fire PASSWORD_RECOVERY (session check handles it)
    (supabase.auth.onAuthStateChange as Mock).mockImplementation(() => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    }));

    // Default: updateUser succeeds
    (supabase.auth.updateUser as Mock).mockResolvedValue({ error: null });
  });

  afterEach(() => {
    languageSpy.mockRestore();
  });

  const renderResetPassword = () =>
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

  it("shows validating state initially then shows the form after session is detected", async () => {
    renderResetPassword();

    // Should show validating text initially
    expect(screen.getByText(translations.en.auth_validating_reset_link)).toBeInTheDocument();

    // After getSession resolves, form should appear
    const newPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_new);
    expect(newPasswordInput).toBeInTheDocument();
  });

  it("transitions to ready on PASSWORD_RECOVERY event", async () => {
    (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as Mock).mockImplementation((cb: Function) => {
      setTimeout(() => cb("PASSWORD_RECOVERY", {}), 10);
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    renderResetPassword();

    const newPasswordInput = await screen.findByPlaceholderText(translations.en.auth_reset_password_new);
    expect(newPasswordInput).toBeInTheDocument();
  });

  it("updates the password when the inputs satisfy all requirements", async () => {
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
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: STRONG_PASSWORD });
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
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows the invalid link UI when no recovery session is detected within timeout", async () => {
    vi.useFakeTimers();
    try {
      // No PASSWORD_RECOVERY event, no session
      (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });

      renderResetPassword();

      // Initially shows validating
      expect(screen.getByText(translations.en.auth_validating_reset_link)).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      // After timeout, should show invalid
      expect(screen.getByText(translations.en.auth_reset_token_invalid)).toBeInTheDocument();
      expect(screen.getByText(translations.en.auth_reset_token_expired)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats session errors as invalid reset links", async () => {
    (supabase.auth.onAuthStateChange as Mock).mockImplementation((cb: Function) => {
      setTimeout(() => cb("PASSWORD_RECOVERY", {}), 10);
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    (supabase.auth.updateUser as Mock).mockResolvedValue({
      error: { message: "session expired", status: 401 },
    });

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
