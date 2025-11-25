import { supabase } from "@/integrations/supabase/client";

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

interface EdgeFunctionErrorLike {
  message?: string;
  context?: {
    response?: Response;
  };
}

async function parseEdgeFunctionError(error: EdgeFunctionErrorLike): Promise<PasswordResetRequestResult> {
  const response = error.context?.response;

  if (!response) {
    return {
      success: false,
      messageKey: "auth.reset_password_failed",
      shouldResetCaptcha: true,
    };
  }

  const clonedResponse = response.clone();
  let body: Record<string, unknown> | undefined;

  try {
    body = await clonedResponse.json();
  } catch (jsonError) {
    console.warn("[passwordReset] Failed to parse edge function error", jsonError);
  }

  const retryAfterHeader = clonedResponse.headers.get("Retry-After");
  const retryAfter = (body?.retryAfter as number | undefined) ?? (retryAfterHeader ? Number(retryAfterHeader) : undefined);
  const messageFromBody = typeof body?.messageKey === "string"
    ? body.messageKey
    : typeof body?.error === "string"
      ? body.error
      : undefined;

  return {
    success: false,
    messageKey: messageFromBody ?? "auth.reset_password_failed",
    retryAfter: Number.isFinite(retryAfter) ? Number(retryAfter) : undefined,
    status: clonedResponse.status,
    shouldResetCaptcha: clonedResponse.status >= 400,
  };
}

export async function requestPasswordReset(
  payload: PasswordResetRequestPayload,
): Promise<PasswordResetRequestResult> {
  const { email, captchaToken } = payload;

  const { data, error } = await supabase.functions.invoke(
    "enhanced-auth?action=request-password-reset",
    {
      body: {
        email,
        captchaToken,
      },
    },
  );

  if (error) {
    return await parseEdgeFunctionError(error as EdgeFunctionErrorLike);
  }

  if (data?.error) {
    const normalizedMessageKey = typeof data.messageKey === "string"
      ? data.messageKey
      : typeof data.error === "string"
        ? data.error
        : "auth.reset_password_failed";
    return {
      success: false,
      messageKey: normalizedMessageKey,
      retryAfter: data.retryAfter,
      status: data.status,
      shouldResetCaptcha: true,
    };
  }

  const successMessageKey = typeof data?.messageKey === "string" ? data.messageKey : undefined;

  return {
    success: true,
    messageKey: successMessageKey,
  };
}
