import { env } from "@/lib/env";
import { logError } from "@/lib/logger";

export interface PasswordResetRequestResult {
  success: boolean;
  messageKey?: string;
  retryAfter?: number;
  status?: number;
  shouldResetCaptcha?: boolean;
}

interface PasswordResetRequestPayload {
  email: string;
  captchaToken: string;
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

    if (!response.ok) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfter = (body?.retryAfter as number | undefined) ?? (retryAfterHeader ? Number(retryAfterHeader) : undefined);
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
