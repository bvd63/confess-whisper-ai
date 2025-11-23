import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { EdgeLogger } from "./logger.ts";

const jsonHeaders = (corsHeaders?: Record<string, string>) => ({
  "Content-Type": "application/json",
  ...(corsHeaders ?? {}),
});

const toErrorResponse = (
  status: number,
  payload: Record<string, unknown>,
  corsHeaders?: Record<string, string>,
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders(corsHeaders),
  });

export interface ValidateJsonBodyOptions<T extends z.ZodTypeAny> {
  req: Request;
  schema: T;
  corsHeaders?: Record<string, string>;
  logger?: EdgeLogger;
  errorCode?: string;
  message?: string;
  messageKey?: string;
}

export type ValidateJsonBodyResult<T> =
  | { success: true; data: T; raw: unknown }
  | { success: false; response: Response };

export const validateJsonBody = async <T extends z.ZodTypeAny>(
  options: ValidateJsonBodyOptions<T>,
): Promise<ValidateJsonBodyResult<z.infer<T>>> => {
  const {
    req,
    schema,
    corsHeaders,
    logger,
    errorCode = "INVALID_BODY",
    message = "Invalid request body",
    messageKey = "common.invalid_request",
  } = options;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (error) {
    logger?.warn?.("Failed to parse JSON body", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      response: toErrorResponse(
        400,
        {
          error: "INVALID_JSON",
          message: "Request body must be valid JSON",
          messageKey,
        },
        corsHeaders,
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    logger?.warn?.("Request body validation failed", { issues });
    return {
      success: false,
      response: toErrorResponse(
        400,
        {
          error: errorCode,
          message,
          messageKey,
          issues,
        },
        corsHeaders,
      ),
    };
  }

  return { success: true, data: parsed.data, raw };
};

export const buildJsonResponse = (
  payload: Record<string, unknown>,
  status = 200,
  corsHeaders?: Record<string, string>,
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders(corsHeaders),
  });

export { z };
