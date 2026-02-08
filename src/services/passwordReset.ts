import { env } from "@/lib/env";
import { logError } from "@/lib/logger";

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
  const { email, captchaToken } = payload;
  const endpoint = `${env.client.supabaseUrl.replace(/\/$/, "")}/functions/v1/enhanced-auth?action=request-password-reset`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.client.supabaseAnonKey,
        Authorization: `Bearer ${env.client.supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, captchaToken }),
    });

    let body: Record<string, unknown> | undefined;
    try {
      body = await response.json();
    } catch (parseError) {
      console.warn("[passwordReset] Failed to parse response body", parseError);
    }

    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = (body?.retry_after as number | undefined)
      ?? (body?.retryAfter as number | undefined)
      ?? (retryAfterHeader ? Number(retryAfterHeader) : undefined);

    if (response.status === 429 || body?.rate_limited) {
      return {
        success: false,
        rateLimited: true,
        retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : undefined,
      };
    }

    if (body?.captcha_required) {
      return {
        success: false,
        captchaRequired: true,
      };
    }

    if (body?.captcha_failed) {
      return {
        success: false,
        captchaFailed: true,
        messageKey: typeof body?.messageKey === "string" ? body.messageKey : "auth.captcha_failed",
      };
    }

    if (!response.ok) {
      const messageFromBody = typeof body?.messageKey === "string"
        ? body.messageKey
        : typeof body?.error === "string"
          ? body.error
          : "auth.reset_password_failed";

      return {
        success: false,
        messageKey: messageFromBody,
        retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
        status: response.status,
        shouldResetCaptcha: true,
      };
    }

    const successMessageKey = typeof body?.messageKey === "string" ? body.messageKey : "auth.forgot_password_success";

    return {
      success: true,
      messageKey: successMessageKey,
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
