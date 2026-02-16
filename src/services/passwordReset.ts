import { env } from "@/lib/env";
import { logError } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

export interface PasswordResetRequestResult {
  success: boolean;
  messageKey?: string;
  retryAfter?: number;
  status?: number;
  shouldResetCaptcha?: boolean;
  rateLimited?: boolean;
  captchaRequired?: boolean;
  captchaFailed?: boolean;
}

interface PasswordResetRequestPayload {
  email: string;
  captchaToken?: string;
}

export async function requestPasswordReset(
  payload: PasswordResetRequestPayload,
): Promise<PasswordResetRequestResult> {
  const isTestEnv = import.meta?.env?.MODE === "test";
  const { email, captchaToken } = payload;

  try {
    const { data, error } = await supabase.functions.invoke("enhanced-auth", {
      body: {
        action: "request-password-reset",
        email,
        captchaToken,
      },
    });

    const body = (data as Record<string, unknown>) ?? {};
    const status = (error as { status?: number } | null)?.status ?? 200;
    const retryAfterHeader = (error as any)?.headers?.["Retry-After"] ?? undefined;
    const retryAfter = (body?.retry_after as number | undefined)
      ?? (body?.retryAfter as number | undefined)
      ?? (retryAfterHeader ? Number(retryAfterHeader) : undefined);

    if (status === 429 || body?.rate_limited || body?.rateLimited) {
      return {
        success: false,
        rateLimited: true,
        retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : undefined,
      };
    }

    if (error?.status === 400) {
      return {
        success: false,
        messageKey: "auth.captcha_failed",
        status: 400,
        shouldResetCaptcha: true,
      };
    }

    if ((error?.status ?? 0) >= 500) {
      return {
        success: false,
        messageKey: "auth.reset_password_failed",
        status: 500,
      };
    }

    const captchaRequired = body?.captcha_required ?? body?.captchaRequired;
    if (captchaRequired) {
      return {
        success: false,
        captchaRequired: true,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : "auth.captcha_required",
        shouldResetCaptcha: body?.shouldResetCaptcha === true ? true : false,
      };
    }

    const captchaFailed = body?.captcha_failed ?? body?.captchaFailed;
    if (captchaFailed) {
      return {
        success: false,
        captchaFailed: true,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : "auth.captcha_failed",
        shouldResetCaptcha: body?.shouldResetCaptcha !== false,
      };
    }

    if (error) {
      if (status === 400) {
        return {
          success: false,
          messageKey: "auth.captcha_failed",
          retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
          status,
          shouldResetCaptcha: true,
        };
      }

      if (status >= 500) {
        return {
          success: false,
          messageKey: "auth.reset_password_failed",
          retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
          status,
          shouldResetCaptcha: false,
        };
      }

      return {
        success: false,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : "auth.reset_password_failed",
        retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
        status,
        shouldResetCaptcha: true,
      };
    }

    return {
      success: true,
      messageKey: "auth.forgot_password_success",
    };
  } catch (error) {
    logError("Password reset request failed", error as Error);
    return {
      success: false,
      messageKey: "auth.reset_password_failed",
      shouldResetCaptcha: true,
    };
  }
}

export interface ValidateResetTokenResult {
  valid: boolean;
  messageKey?: string;
}

export async function validateResetToken(token: string): Promise<ValidateResetTokenResult> {
  const endpoint = `${env.client.supabaseUrl.replace(/\/$/, "")}/functions/v1/enhanced-auth?action=validate-reset-token`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.client.supabaseAnonKey,
        Authorization: `Bearer ${env.client.supabaseAnonKey}`,
      },
      body: JSON.stringify({ token }),
    });

    const body = await response.json().catch(() => undefined as unknown as Record<string, unknown>);

    if (!response.ok) {
      return { valid: false, messageKey: typeof (body as any)?.messageKey === "string" ? (body as any).messageKey : undefined };
    }

    return { valid: Boolean((body as any)?.valid) };
  } catch (error) {
    logError("Reset token validation failed", error as Error);
    return { valid: false };
  }
}

export interface CompletePasswordResetResult {
  success: boolean;
  invalidToken?: boolean;
  messageKey?: string;
}

export async function completePasswordReset(payload: { token: string; password: string }): Promise<CompletePasswordResetResult> {
  const endpoint = `${env.client.supabaseUrl.replace(/\/$/, "")}/functions/v1/enhanced-auth?action=complete-password-reset`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.client.supabaseAnonKey,
        Authorization: `Bearer ${env.client.supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => undefined as unknown as Record<string, unknown>);

    if (!response.ok) {
      const messageKey = typeof (body as any)?.messageKey === "string" ? (body as any).messageKey : undefined;
      return {
        success: false,
        invalidToken: Boolean((body as any)?.invalid_token),
        messageKey,
      };
    }

    return { success: true };
  } catch (error) {
    logError("Password reset completion failed", error as Error);
    return { success: false, messageKey: "auth.reset_password_error" };
  }
}
