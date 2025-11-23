import { createLogger } from "./logger-core.ts";

const environment = Deno.env.get("MODE") ?? Deno.env.get("NODE_ENV") ?? "production";

const edgeLogger = createLogger({
  service: "edge",
  component: "supabase-functions",
  environment,
});

export const logDebug = (message: string, context?: Record<string, unknown>) =>
  edgeLogger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) =>
  edgeLogger.info(message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) =>
  edgeLogger.warn(message, context);
export const logError = (message: string, context?: Record<string, unknown>) =>
  edgeLogger.error(message, context);
export const logMetric = (name: string, value: number, context?: Record<string, unknown>) =>
  edgeLogger.metric(name, value, context);
export const logEvent = (name: string, context?: Record<string, unknown>) =>
  edgeLogger.event(name, context);

export const withRequestContext = (
  base: Record<string, unknown>,
  extra?: Record<string, unknown>,
) => edgeLogger.withContext(base, extra);

export const createFunctionLogger = (functionName: string, requestId?: string) =>
  edgeLogger.child({
    functionName,
    defaultContext: requestId ? { requestId } : undefined,
  });

export type EdgeLogger = ReturnType<typeof createFunctionLogger>;
